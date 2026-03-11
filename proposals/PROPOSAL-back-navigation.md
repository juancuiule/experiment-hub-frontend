# Proposal: Back Navigation

## Problem

The flow engine is strictly forward-only. Once a participant submits a screen, there is no way to go back and change an answer. This is a hard blocker for usability: accidental taps, misread questions, and auto-advance inputs all leave participants stuck.

---

## Proposed Design

### 1. Add a history stack to `FlowStep`

```ts
// lib/types.ts

export type FlowStep<S extends State = State> = {
  state: S;
  experiment: ExperimentFlow;
  context: Context;
  dataPath?: string[];
  history?: FlowStep[]; // ← new: snapshots of previous steps
};
```

Each call to `traverse` pushes the current step onto `history` before advancing.
The history contains full `FlowStep` snapshots, so going back is just popping the stack
— no re-traversal needed.

### 2. Export a `back` function

```ts
// lib/flow.ts

export function back(step: FlowStep): FlowStep | null {
  if (!step.history || step.history.length === 0) return null;
  const previous = step.history[step.history.length - 1];
  return {
    ...previous,
    history: step.history.slice(0, -1),
  };
}
```

Returns `null` when on the first screen (no history), so the UI can hide or disable
the back button.

### 3. History is not accumulated across checkpoints (configurable)

Checkpoints already signal "the participant has been recorded here". It is reasonable
to treat a checkpoint as a point of no return. A `noBackBeyond` flag on the checkpoint node props controls this:

```ts
// If the previous step crossed a checkpoint with noBackBeyond: true, back() returns null.
```

### 4. Context rollback

Going back restores the full context snapshot from history, including data. This means
any answers submitted on the screen being "un-done" are reverted. On re-submission,
`traverse` writes them again. No special merge logic is needed.

### 5. Fork and path awareness

- **Fork**: going back before a fork re-enters the fork node, which will re-run
  `selectForkByWeight`. To keep the same arm, the fork selection should be stored in
  `context.forks` (it already is), and `traverseInNode` for fork should check
  `context.forks[nodeId]` before calling `selectForkByWeight`.
- **Loop**: going back within a loop iteration restores the previous index. The loop
  state snapshot in history includes the correct `index`.
- **Path**: going back within a path restores `step` and `innerState`.

### 6. `send()` on back

Going back should NOT call `send()` — it's a local state restoration. Only forward
traversal triggers `send()`.

---

## UI Integration

```tsx
// src/ExperimentRunner.tsx (example)

const canGoBack = back(step) !== null;

<button onClick={() => setStep(back(step)!)} disabled={!canGoBack}>
  Back
</button>;
```

---

## Affected Files

| File                               | Change                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `lib/types.ts`                     | Add `history?: FlowStep[]` to `FlowStep`                             |
| `lib/flow.ts`                      | Push to history in `traverse`; add `back()`; fork re-uses stored arm |
| `lib/nodes.ts`                     | Add `noBackBeyond?: boolean` to `CheckpointNode` props               |
| `src/ExperimentRunner.tsx`         | Render back button; call `back()`                                    |
| `lib/specs/flow/flow.back.test.ts` | New test suite                                                       |

---

## Open Questions

- Should history be capped at N entries to bound memory usage for very long flows?
- Should going back before a completed checkpoint warn the researcher that data was
  already recorded?
- Should `send()` be called on back with a "retract" signal so the server can update
  its record?
