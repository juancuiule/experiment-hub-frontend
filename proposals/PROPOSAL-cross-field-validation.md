# Proposal: Cross-Field Validation

## Problem

Zod schemas built by `buildSchema` are constructed field-by-field with no awareness of sibling fields. Use cases that require one field to constrain another are impossible today:

- "Confirm email" must match "email"
- "End date" must be after "Start date"
- "Other (please specify)" text becomes required only when "Other" checkbox is selected

---

## Proposed Design

### 1. Add `crossValidate` to screen component props

```ts
// lib/components/response.ts

export type CrossFieldRule = {
  /** Field being validated. */
  targetKey: string;
  /** Condition that must hold for the rule to fire. Uses the $-prefix syntax. */
  when?: ConditionConfig;
  /** Operator applied between targetKey's value and refKey's value. */
  operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  /** Field whose value is the right-hand side of the comparison. */
  refKey: string;
  message: string;
};
```

Each `ScreenComponent` (or just `FrameworkScreen`) gains an optional
`crossValidate?: CrossFieldRule[]` prop.

### 2. Build a Zod superRefine from the rules

```ts
// lib/schema.ts

export function buildCrossValidation(
  rules: CrossFieldRule[],
  context: Context,
): (data: Record<string, any>, ctx: z.RefinementCtx) => void {
  return (data, zodCtx) => {
    for (const rule of rules) {
      const when = rule.when
        ? evaluateCondition(rule.when, { ...context, screenData: data })
        : true;
      if (!when) continue;

      const target = data[rule.targetKey];
      const ref = data[rule.refKey];
      const passes = evaluateBaseOperator(rule.operator, target, ref);

      if (!passes) {
        zodCtx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [rule.targetKey],
          message: rule.message,
        });
      }
    }
  };
}
```

### 3. Wire into `Screen.tsx`

```ts
// src/Screen.tsx

const schema = useMemo(() => {
  const base = buildSchema(screen.components);
  const rules = screen.crossValidate ?? [];
  return rules.length > 0
    ? base.superRefine(buildCrossValidation(rules, context))
    : base;
}, [screen, context]);
```

`zodResolver` already supports schemas with `superRefine`, so no other wiring is needed.

---

## Usage Example

```ts
// Screen definition
{
  slug: "dates",
  components: [
    { componentFamily: "response", template: "text-input", props: { dataKey: "startDate", label: "Start date", type: "date" } },
    { componentFamily: "response", template: "text-input", props: { dataKey: "endDate",   label: "End date",   type: "date" } },
    { componentFamily: "layout",   template: "button",     props: { text: "Continue" } },
  ],
  crossValidate: [
    {
      targetKey: "endDate",
      operator: "gte",
      refKey: "startDate",
      message: "End date must be on or after start date",
    },
  ],
}
```

---

## "Required-when" Pattern

The most common cross-field case — "field B is required only when checkbox A is checked"
— is handled by combining `when` with an `eq` check against an empty string:

```ts
{
  targetKey: "otherText",
  when: { operator: "contains", dataKey: "$activities", value: "other" },
  operator: "neq",
  refKey: "_empty",   // sentinel: a field that is always ""
  message: "Please describe the other activity",
}
```

Alternatively, expose a `requiredWhen` shorthand on individual component props to keep the screen definition cleaner.

---

## Affected Files

| File                            | Change                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| `lib/schema.ts`                 | `buildCrossValidation`, export `evaluateBaseOperator`          |
| `lib/screen.ts`                 | Add `crossValidate?: CrossFieldRule[]` to `FrameworkScreen`    |
| `src/Screen.tsx`                | Merge cross-validation into the resolved schema                |
| `lib/validate.ts`               | Check that `refKey` exists in the same screen's component list |
| `lib/specs/cross-field.test.ts` | New test suite                                                 |

---

## Open Questions

- Should `crossValidate` live on `FrameworkScreen` or be scattered across individual
  component props (closer to where the constraint is declared)?
- How should errors appear when the ref field has not yet been touched?
- Is the sentinel `_empty` approach for required-when clean enough, or should we add
  a dedicated `requiredWhen` prop?
