# Proposal: Option Randomization

## Problem

The `randomize` prop is defined on response component types (`checkboxes`, `likert-scale`, `radio`) in the type system but is silently ignored at render time. Randomizing option order is a standard counterbalancing technique in surveys and experiments. Without it, researchers must manually create separate screen variants, which bloats the flow definition.

---

## Current State

```ts
// lib/components/response.ts (existing)
export interface CheckboxesComponent extends BaseResponseComponent<
  "checkboxes",
  {
    dataKey: string;
    label: string;
    options: Option[];
    randomize?: boolean; // ← declared, never read
    required?: boolean;
  }
> {}
```

The `randomize` flag exists on `CheckboxesComponent`, `LikertScaleComponent`, and
`RadioComponent`. None of the corresponding React components consume it.

---

## Proposed Design

### 1. Shuffle options at render time, not at schema definition time

Shuffling must happen once per render of the screen component, not on every re-render.
`useMemo` with a stable random seed achieves this.

```ts
// Inside Checkboxes.tsx, LikertScale.tsx, Radio.tsx

const displayOptions = useMemo(() => {
  return component.props.randomize
    ? shuffle([...component.props.options])
    : component.props.options;
}, [component.props.options, component.props.randomize]);
```

`shuffle` is already exported from `lib/utils.ts` (Fisher-Yates).

### 2. Record the displayed order in context

When `randomize: true`, the order participants saw matters for analysis. Store it in
`context.data` at submission time alongside the response value:

```ts
// In Screen.tsx, before calling onNext:
const optionOrder = displayOptions.map((o) => o.value);
// Merge into submitted data under a reserved key:
onNext({ ...formData, [`${dataKey}__order`]: optionOrder });
```

The `__order` suffix is a convention the researcher's analysis pipeline can rely on.

### 3. Deterministic shuffle (optional, for reproducibility)

If the flow carries a `seed` in `context` (see PROPOSAL-deterministic-randomization.md),
use it to seed the shuffle:

```ts
const displayOptions = useMemo(() => {
  if (!component.props.randomize) return component.props.options;
  const seed = context.seed ?? Math.random();
  return seededShuffle([...component.props.options], seed);
}, [component.props.options, component.props.randomize, context.seed]);
```

A `seededShuffle` using a mulberry32 PRNG can be added to `lib/utils.ts`.

### 4. Validator addition

Add a `randomize-non-list` warning when `randomize: true` is set on a component type
that does not have an `options` array (e.g., `text-input`).

---

## Usage Example

```ts
{
  componentFamily: "response",
  template: "checkboxes",
  props: {
    dataKey: "activities",
    label: "Select all activities you enjoy",
    randomize: true,
    options: [
      { label: "Reading",  value: "reading" },
      { label: "Cooking",  value: "cooking" },
      { label: "Exercise", value: "exercise" },
    ],
  },
}
```

Each participant sees the options in a different random order. The submitted data
includes `{ activities: ["cooking", "reading"], activities__order: ["exercise", "reading", "cooking", "exercise"] }`.

---

## Affected Files

| File                                      | Change                                          |
| ----------------------------------------- | ----------------------------------------------- |
| `src/components/response/Checkboxes.tsx`  | Read `randomize`, apply `shuffle` via `useMemo` |
| `src/components/response/LikertScale.tsx` | Same                                            |
| `src/components/response/Radio.tsx`       | Same (when implemented)                         |
| `src/Screen.tsx`                          | Optionally capture `__order` at submit time     |
| `lib/validate.ts`                         | `randomize-non-list` warning                    |
| `lib/utils.ts`                            | Optionally add `seededShuffle`                  |

---

## Open Questions

- Should `__order` recording be opt-in (a separate `recordOrder` prop) rather than
  automatic? Researchers may not always need it.
- Should the shuffle seed live in `context` globally or per-component?
- For `likert-scale`, randomizing the scale endpoints (1 vs 5 as "agree") is a distinct
  concern — should a `reverseScale` prop be separate from `randomize`?
