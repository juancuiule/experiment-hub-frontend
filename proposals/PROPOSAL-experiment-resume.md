# Proposal: Experiment Resume

## Problem

If a participant closes the browser mid-session, they must start from the beginning.
For long experiments this is a serious data quality issue: partial datasets pile up
and completion rates drop. Restoring a session requires persisting the `FlowStep` and
rehydrating it on page load.

---

## Proposed Design

### 1. Serializable `FlowStep`

The existing `FlowStep` type is already plain data (no functions, no class instances),
so it can be `JSON.stringify`'d directly. Verify this holds by auditing the `State`
union — all members contain only primitive fields and plain objects. ✓

### 2. Save after every `traverse` call

```ts
// lib/session.ts

const SESSION_KEY = "experiment_session";

export function saveSession(step: FlowStep): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(step));
  } catch {
    // Storage full or unavailable — fail silently, do not block the experiment
  }
}

export function loadSession(experimentId: string): FlowStep | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const step: FlowStep = JSON.parse(raw);
    // Guard: only restore if it's for the same experiment
    if ((step.experiment as any)?.id !== experimentId) return null;
    return step;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
```

`sessionStorage` is used (not `localStorage`) because sessions are naturally scoped to a
browser tab. Upgrade to `localStorage` for cross-tab resume or server-side persistence.

### 3. Add `id` to `ExperimentFlow`

```ts
// lib/types.ts

export type ExperimentFlow = {
  id: string;           // ← new: stable identifier for the experiment
  nodes: FrameworkNode[];
  edges: FrameworkEdge[];
  screens?: FrameworkScreen[];
};
```

The `id` guards against restoring a session from a different or updated experiment.

### 4. Invalidate stale sessions

Flow definitions change between deploys. A saved step might reference node IDs that
no longer exist. Add a `version` field to `ExperimentFlow`:

```ts
version?: string;   // e.g., a git SHA or timestamp
```

On load, compare `savedStep.experiment.version` with `currentExperiment.version`. If
they differ, discard the saved session and start fresh.

### 5. Resume in `app/page.tsx`

```tsx
// app/page.tsx

const [step, setStep] = useState<FlowStep | null>(null);

useEffect(() => {
  const saved = loadSession(experiment.id);
  if (saved) {
    setStep(saved);          // resume
  } else {
    startExperiment(experiment, startNodeId).then(setStep);
  }
}, []);

const handleNext = async (data: Record<string, any>) => {
  const next = await traverse(step!, data);
  saveSession(next);
  setStep(next);
};

const handleComplete = () => {
  clearSession();
  // navigate to thank-you page
};
```

### 6. Resume UX

Show a "Welcome back" interstitial before resuming so participants aren't disoriented:

```tsx
if (hasResumableSession && !confirmed) {
  return <ResumePrompt onResume={confirm} onRestart={clearAndRestart} />;
}
```

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | Add `id` and `version` to `ExperimentFlow` |
| `lib/session.ts` | New file: `saveSession`, `loadSession`, `clearSession` |
| `app/page.tsx` | Resume logic, save after each step |
| `src/ResumePrompt.tsx` | New component: "Continue where you left off?" UI |
| `lib/specs/session.test.ts` | New test suite (unit tests for session helpers) |

---

## Open Questions

- Should the saved session be encrypted (e.g., AES-GCM) to prevent participants from
  inspecting or editing their progress?
- For server-side persistence, should the session be tied to a participant token issued
  by the backend, or to a device fingerprint?
- When the flow version changes mid-experiment (hotfix deploy), should we attempt to
  map the saved state to the new version, or always restart?
