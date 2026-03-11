# Proposal: Response Timing

## Inspiration
Gorilla SC makes response timing a first-class feature, recording milliseconds per
screen and per individual response interaction. Reaction time is a core dependent
variable in many cognitive and behavioral studies. Even for non-RT studies, time-on-page
data helps detect speeding (participants rushing through without reading).

## Problem

No time data is recorded. The `send()` call only transmits `context`, which contains
collected form values but no timestamps. Researchers cannot distinguish a 200ms click
from a 5-minute considered response.

---

## Proposed Design

### 1. Add timing to `Context`

```ts
// lib/types.ts

export type ScreenTiming = {
  screenSlug: string;
  nodeId?: string;
  enteredAt: number;    // Date.now() when screen was first shown
  submittedAt: number;  // Date.now() when onNext was called
  durationMs: number;   // submittedAt - enteredAt
};

// Extend Context:
timing?: {
  screens: ScreenTiming[];
  totalMs?: number;       // sum of all durationMs
};
```

### 2. Record entry time in `Screen.tsx`

```tsx
// src/Screen.tsx

const enteredAtRef = useRef(Date.now());

// Reset on every new screen render (slug change)
useEffect(() => {
  enteredAtRef.current = Date.now();
}, [screen.slug]);

const handleSubmit = async (data: Record<string, any>) => {
  const submittedAt = Date.now();
  const timing: ScreenTiming = {
    screenSlug: screen.slug,
    enteredAt: enteredAtRef.current,
    submittedAt,
    durationMs: submittedAt - enteredAtRef.current,
  };
  await onNext(data, timing);   // ← pass timing alongside form data
};
```

### 3. `onNext` signature change

```ts
// The callback type gains an optional second argument:
type OnNext = (data: Record<string, any>, timing?: ScreenTiming) => Promise<void>;
```

The `ExperimentRunner` merges the timing record into context before calling `traverse`:

```ts
const handleNext = async (data: Record<string, any>, timing?: ScreenTiming) => {
  const timedStep = timing
    ? { ...step, context: appendTiming(step.context, timing) }
    : step;
  const next = await traverse(timedStep, data);
  setStep(next);
};

function appendTiming(context: Context, record: ScreenTiming): Context {
  const screens = [...(context.timing?.screens ?? []), record];
  return {
    ...context,
    timing: {
      screens,
      totalMs: screens.reduce((sum, s) => sum + s.durationMs, 0),
    },
  };
}
```

### 4. First-keypress timing (optional, fine-grained)

For reaction-time studies, time-to-first-keypress matters more than total duration.
The `Screen` component can record the first interaction event:

```tsx
const firstKeypressRef = useRef<number | null>(null);

const handleFirstInteraction = () => {
  if (firstKeypressRef.current === null) {
    firstKeypressRef.current = Date.now() - enteredAtRef.current;
  }
};
```

Include `firstInteractionMs` in `ScreenTiming` when present.

### 5. Speeders detection

Flag participants whose median screen duration is below a threshold (e.g., half the
minimum estimated reading time):

```ts
// lib/timing.ts

export function isSpeeder(timing: Context["timing"], wordsPerScreen: number[]): boolean {
  if (!timing) return false;
  const minReadMs = wordsPerScreen.map((w) => (w / 250) * 60_000); // 250 wpm
  return timing.screens.some((s, i) => s.durationMs < (minReadMs[i] ?? 0) * 0.5);
}
```

### 6. Validator additions

No structural validation needed; timing is always optional and purely additive to
context.

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | `ScreenTiming`, extend `Context` with `timing` |
| `src/Screen.tsx` | Capture `enteredAt`, compute `durationMs`, pass to `onNext` |
| `src/ExperimentRunner.tsx` | Merge timing into context before `traverse` |
| `lib/timing.ts` | New file: `isSpeeder`, utility helpers |
| `lib/specs/timing.test.ts` | New test suite |

---

## Open Questions

- Should timing be opt-in per-screen (a `recordTiming: true` flag on the screen
  definition) or recorded for every screen globally?
- Should timing data be excluded from the main `context.data` payload to avoid
  bloating the sent object? It could be a separate API call.
- For Gorilla SC-style sub-millisecond precision, `Date.now()` is insufficient —
  should `performance.now()` be used instead?
