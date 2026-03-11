# Proposal: URL Hidden Fields

## Inspiration
Typeform hidden fields, Qualtrics embedded data, and Prolific/MTurk study link
parameters. Researchers distribute unique study links like:

```
https://study.example.com/?pid=abc123&source=prolific&condition=A
```

The app needs to capture those parameters, make them available throughout the flow for
piping and branching, and include them in every `send()` call for participant tracking.

## Problem

`context` is initialized as `{}` in `startExperiment`. There is no mechanism to seed it
with data from the URL before traversal begins. Prolific's participant ID, an MTurk
assignment ID, or a pre-assigned condition label cannot be captured today.

---

## Proposed Design

### 1. Extend `ExperimentFlow` with a `hiddenFields` declaration

```ts
// lib/types.ts

export type HiddenField = {
  /** The URL query parameter name to read from. */
  param: string;
  /** Where to store it in context.data. Defaults to param name. */
  dataKey?: string;
  /** Value to use if the param is absent from the URL. */
  default?: string;
  /** If true, throw / warn when the param is missing and no default is set. */
  required?: boolean;
};

export type ExperimentFlow = {
  // ...existing fields...
  hiddenFields?: HiddenField[];
};
```

### 2. `resolveHiddenFields` utility

```ts
// lib/hidden-fields.ts

export function resolveHiddenFields(
  fields: HiddenField[],
  searchParams: URLSearchParams,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = searchParams.get(field.param) ?? field.default;
    if (value == null && field.required) {
      console.warn(`[hidden-fields] Required param "${field.param}" is missing from URL`);
      continue;
    }
    if (value != null) {
      result[field.dataKey ?? field.param] = value;
    }
  }
  return result;
}
```

### 3. Seed context before `startExperiment`

In `app/page.tsx` (or wherever the experiment is bootstrapped):

```tsx
// app/page.tsx

const searchParams = new URLSearchParams(window.location.search);
const hidden = resolveHiddenFields(experiment.hiddenFields ?? [], searchParams);

const step = await startExperiment(experiment, startNodeId, {
  initialContext: { data: { hidden } },
});
```

`startExperiment` gains an optional `options` argument:

```ts
export async function startExperiment(
  experiment: ExperimentFlow,
  startNodeId?: string,
  options?: { initialContext?: Context },
): Promise<FlowStep> {
  const context: Context = options?.initialContext ?? {};
  // ...
}
```

Hidden field values are then accessible anywhere in the flow as `$$hidden.pid`,
`$$hidden.source`, etc.

### 4. Usage example — Prolific integration

```ts
// Experiment definition
hiddenFields: [
  { param: "PROLIFIC_PID",    dataKey: "prolific_pid",    required: true },
  { param: "STUDY_ID",        dataKey: "study_id",        required: true },
  { param: "SESSION_ID",      dataKey: "session_id",      required: true },
  { param: "condition",       dataKey: "assigned_condition", default: "control" },
]

// In a branch node:
{ operator: "eq", dataKey: "$$hidden.assigned_condition", value: "treatment" }

// In a label:
"Thank you for participating, your completion code will be sent to Prolific ID $$hidden.prolific_pid."
```

### 5. Security consideration

URL parameters are visible to participants and can be tampered with. Do not use hidden
fields to store sensitive data or to make security-critical decisions. For condition
assignment integrity, always validate on the server side.

### 6. Validator additions

- `hidden-field-key-collision` — two hidden fields map to the same `dataKey`
- `hidden-field-reserved-key` — `dataKey` conflicts with a reserved context key
  (`start`, `checkpoints`, `forks`, etc.)

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | `HiddenField`, extend `ExperimentFlow`, extend `startExperiment` options |
| `lib/hidden-fields.ts` | New file: `resolveHiddenFields` |
| `lib/flow.ts` | Accept `initialContext` in `startExperiment` |
| `app/page.tsx` | Read `URLSearchParams`, call `resolveHiddenFields` |
| `lib/validate.ts` | Two new validation codes |
| `lib/specs/hidden-fields.test.ts` | New test suite |

---

## Open Questions

- Should hidden fields support non-string types (numbers, booleans) with a `type`
  property, or always treat them as strings?
- Should the app support hash-based parameters (`#pid=abc`) in addition to query
  params for platforms that use hash routing?
- For MTurk: the `assignmentId`, `hitId`, and `workerId` params need to be forwarded
  to the backend — should there be a first-class MTurk mode that handles this
  automatically?
