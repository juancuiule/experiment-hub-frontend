# Proposal: Researcher Preview Mode

## Inspiration
Typeform's Preview button, Google Forms' preview link, Gorilla SC's preview mode.
Researchers need to walk through the full experiment before publishing — seeing every
branch, every loop iteration, every screen — without polluting the production dataset.

## Problem

There is no distinction between a researcher testing the flow and a real participant.
Every `send()` call writes to the real dataset. Researchers must either:
- Manually delete test responses after every preview run, or
- Comment out `send()` calls during development, risking an accidental deploy with
  data collection disabled.

---

## Proposed Design

### 1. Preview flag in `startExperiment`

```ts
// lib/flow.ts

export async function startExperiment(
  experiment: ExperimentFlow,
  startNodeId?: string,
  options?: {
    initialContext?: Context;
    hooks?: FlowHooks;
    preview?: boolean;    // ← new
  },
): Promise<FlowStep>
```

When `preview: true`:
- `send()` is replaced by a no-op (or a console log).
- `context.preview = true` is set, so the backend can filter if the call still goes out.
- Fork selection uses a predictable seed (or exposes a UI to pick the arm manually).
- Checkpoint timestamps use a fake clock that increments by 1 second per step.

### 2. Preview context flag

```ts
// lib/types.ts — extend Context
preview?: boolean;
```

This flag travels with `context` through every `traverse` call. Components can read
it to show researcher-only overlays (current node ID, state type, context inspector).

### 3. Debug overlay component

```tsx
// src/components/debug/FlowDebugOverlay.tsx

export function FlowDebugOverlay({ step }: { step: FlowStep }) {
  if (!step.context.preview) return null;

  return (
    <aside role="complementary" aria-label="Preview inspector">
      <dl>
        <dt>State</dt>       <dd>{step.state.type}</dd>
        <dt>Node ID</dt>     <dd>{getActiveState(step)?.id ?? "—"}</dd>
        <dt>Data path</dt>   <dd>{step.dataPath?.join(" › ") ?? "—"}</dd>
        <dt>Loop index</dt>  <dd>{step.state.type === "in-loop" ? step.state.index : "—"}</dd>
      </dl>
      <details>
        <summary>Full context</summary>
        <pre>{JSON.stringify(step.context, null, 2)}</pre>
      </details>
    </aside>
  );
}
```

### 4. Branch/fork override in preview

In preview mode, when the engine reaches a fork or branch, instead of evaluating
conditions or random weight, show a picker overlay:

```tsx
// If preview mode and state is at a fork:
<ForkPicker
  forks={node.props.forks}
  onSelect={(armId) => traverse(step, { _previewForkOverride: armId })}
/>
```

The `traverse` function checks for `_previewForkOverride` in data and uses it to
force-select a fork arm, skipping `selectForkByWeight`. Similarly for branches.

### 5. Preview entry point in the UI

Add a `?preview=true` URL parameter that activates preview mode:

```tsx
// app/page.tsx

const isPreview = new URLSearchParams(window.location.search).get("preview") === "true";

startExperiment(experiment, startNodeId, { preview: isPreview });
```

### 6. Preview progress summary

At the end of a preview run, show a summary panel:

```tsx
<PreviewSummary
  step={step}
  totalScreens={screensVisited}
  totalTimeMs={totalTimeMs}
  conditionsReached={Object.keys(step.context.forks ?? {})}
  checkpointsCrossed={Object.keys(step.context.checkpoints ?? {})}
/>
```

### 7. "Visit all branches" mode

An advanced preview option that automatically traverses every possible path through
the flow (depth-first) and returns a list of all reachable screens. Useful for QA:

```ts
// lib/flow.ts
export async function previewAllPaths(
  experiment: ExperimentFlow,
): Promise<{ path: string[]; terminalState: State }[]>
```

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | Add `preview` to `Context` |
| `lib/flow.ts` | Accept `preview` option; skip `send()` when preview; handle `_previewForkOverride` |
| `src/components/debug/FlowDebugOverlay.tsx` | New component |
| `src/components/debug/ForkPicker.tsx` | New component |
| `src/components/debug/PreviewSummary.tsx` | New component |
| `app/page.tsx` | Read `?preview` param, pass to `startExperiment` |

---

## Open Questions

- Should preview mode be gated behind an auth check so participants cannot accidentally
  access it via URL manipulation?
- Should the context inspector in the overlay support live editing (change a value,
  re-evaluate conditions) for rapid debugging?
- Should `previewAllPaths` be async and stream results as it discovers branches, or
  compute everything up front?
