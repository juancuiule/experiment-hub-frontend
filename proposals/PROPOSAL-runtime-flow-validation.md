# Proposal: Runtime Flow Validation

## Problem

`validateExperiment` exists and is tested, but it is never called in the running
application. Invalid flows reach participants silently. A mis-spelled node ID, a missing
edge, or an orphaned path node produces a cryptic runtime error mid-session instead of
a clear failure at startup.

---

## Proposed Design

### 1. Validate in `startExperiment`

The safest integration point is `startExperiment` in `lib/flow.ts`. It runs once, before
any traversal, and throwing there prevents any participant from entering a broken flow.

```ts
// lib/flow.ts

export async function startExperiment(
  experiment: ExperimentFlow,
  startNodeId?: string,
): Promise<FlowStep> {
  const errors = validateExperiment(experiment);
  if (errors.length > 0) {
    const summary = errors.map((e) => `[${e.code}] ${e.message}`).join("\n");
    throw new Error(`Invalid experiment flow:\n${summary}`);
  }

  return await traverse(
    { state: { type: "initial" }, experiment, context: {} },
    startNodeId ? { startNodeId } : undefined,
  );
}
```

This is the only change required for the core fix. All existing tests pass because
the test fixtures are valid flows.

### 2. Add a `NODE_ENV` guard for performance

Validation iterates the entire flow graph. In production with large flows this adds a
small upfront cost. Guard it behind a dev-only check if needed:

```ts
if (process.env.NODE_ENV !== "production") {
  const errors = validateExperiment(experiment);
  if (errors.length > 0) {
    /* throw */
  }
}
```

Better: always validate in development and in production's first call only (use a
`WeakSet` keyed on the experiment object to avoid re-validating the same reference).

### 3. Expose a `validateOnMount` option in `app/page.tsx`

For flows loaded from a remote source (JSON from an API), validation after fetch is
the right moment:

```ts
// app/page.tsx

useEffect(() => {
  const errors = validateExperiment(experiment);
  if (errors.length > 0) {
    setError(`Flow configuration error: ${errors[0].message}`);
  }
}, [experiment]);
```

Display an `<ErrorBanner>` component instead of starting the flow.

### 4. Extend the validator with flow-engine-level checks

Several engine errors that currently throw at runtime should become validator errors:

| Runtime throw                         | Validator code     |
| ------------------------------------- | ------------------ |
| "Start node must have a next node"    | `start-no-next`    |
| "Path node must have child nodes"     | `path-no-children` |
| "Loop node must have a template node" | `loop-no-template` |
| Fork with no edges for a defined arm  | `fork-arm-no-edge` |

These are structural checks independent of runtime context, so they belong in the
validator, not scattered through `flow.ts`.

---

## Affected Files

| File                         | Change                                                    |
| ---------------------------- | --------------------------------------------------------- |
| `lib/flow.ts`                | Call `validateExperiment` at the top of `startExperiment` |
| `lib/validate.ts`            | Add the four new structural checks listed above           |
| `app/page.tsx`               | Add `useEffect` validation + error display                |
| `lib/specs/validate.test.ts` | Tests for the four new codes                              |

---

## Open Questions

- Should validation failures in production silently log to an error tracking service
  (e.g., Sentry) instead of throwing, to avoid breaking live sessions from a bad deploy?
- Should the validator be async to allow remote schema lookups (e.g., verifying screen
  slugs against a CMS)?
- Is there value in a `validateExperiment` CLI command that researchers can run before
  publishing a flow?
