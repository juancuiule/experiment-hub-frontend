# Proposal: Participant Progress Tracking

## Problem

Participants in a long experiment have no indication of how far they are or how much
remains. This increases dropout rates. The flow engine has rich state (checkpoints,
paths, loops), but none of it is surfaced as a progress signal to the UI.

---

## Proposed Design

### 1. Define a `ProgressHint` type

Progress in a branching flow cannot be a simple percentage — the path length depends on
which branch the participant is in. We expose a structured hint instead of a raw number:

```ts
// lib/types.ts

export type ProgressHint = {
  /** Completed checkpoints (ordered by first-reached time). */
  checkpointsReached: string[];
  /** Total checkpoints defined in the flow. */
  checkpointsTotal: number;
  /** Index of the current screen within the active path (undefined if not in a path). */
  pathStep?: number;
  /** Total screens in the active path (undefined if not in a path). */
  pathTotal?: number;
  /** Current loop iteration index (undefined if not in a loop). */
  loopIndex?: number;
  /** Total loop iterations (undefined if not in a loop or dynamic loop not yet resolved). */
  loopTotal?: number;
};
```

### 2. Export `getProgress` from `lib/flow.ts`

```ts
export function getProgress(step: FlowStep): ProgressHint {
  const { state, context, experiment } = step;

  const checkpointsTotal = experiment.nodes.filter(
    (n) => n.type === "checkpoint",
  ).length;
  const checkpointsReached = Object.keys(context.checkpoints ?? {});

  const hint: ProgressHint = { checkpointsReached, checkpointsTotal };

  if (state.type === "in-path") {
    hint.pathStep  = state.step + 1;
    hint.pathTotal = state.children.length;
  }

  if (state.type === "in-loop") {
    hint.loopIndex = state.index + 1;
    hint.loopTotal = state.values.length;
  }

  return hint;
}
```

### 3. Derive a display percentage from the hint

The UI converts the hint to a visual representation. A simple heuristic:

```ts
function progressPercent(hint: ProgressHint): number {
  if (hint.checkpointsTotal === 0) return 0;
  const cpProgress = hint.checkpointsReached.length / hint.checkpointsTotal;

  // Weight intra-checkpoint progress at 1/checkpointsTotal of the bar
  const sliceSize = 1 / hint.checkpointsTotal;
  let subProgress = 0;
  if (hint.pathStep !== undefined && hint.pathTotal) {
    subProgress = hint.pathStep / hint.pathTotal;
  } else if (hint.loopIndex !== undefined && hint.loopTotal) {
    subProgress = hint.loopIndex / hint.loopTotal;
  }

  return Math.min(1, cpProgress + subProgress * sliceSize) * 100;
}
```

### 4. ProgressBar component

```tsx
// src/components/layout/ProgressBar.tsx

export function ProgressBar({ hint }: { hint: ProgressHint }) {
  const pct = progressPercent(hint);
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}
```

### 5. Checkpoint-based labels (optional)

Checkpoint names can double as section labels ("Introduction", "Main survey",
"Debrief"). Expose the name of the last reached checkpoint as the current section:

```ts
hint.currentSection = checkpointsReached.at(-1);
```

---

## Usage Example

```tsx
// In ExperimentRunner
const hint = getProgress(step);

<ProgressBar hint={hint} />
<span>{hint.currentSection ?? "Introduction"}</span>
```

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | Add `ProgressHint` type |
| `lib/flow.ts` | Export `getProgress` |
| `src/components/layout/ProgressBar.tsx` | New component |
| `src/ExperimentRunner.tsx` | Render progress bar |
| `lib/specs/flow/flow.progress.test.ts` | New test suite |

---

## Open Questions

- Should `getProgress` be part of `lib/flow.ts` or a separate `lib/progress.ts`?
- For dynamic loops (values resolved from context at runtime), `loopTotal` is known only
  after the loop is entered — how should the bar handle the transition?
- Should researchers be able to hide the progress bar per-screen (e.g., on the debrief
  screen where it might be confusing)?
