# Cross-Field Validation Rules

> **Status:** Draft
> **Author:** —
> **Created:** 2026-03-12
> **Last updated:** 2026-03-12
> **Linked issue:** —

---

## 1. Summary

Add a `crossValidation` prop to response components that allows a field's validation rules to reference the live value of another field on the same screen, using the existing `$key` notation.

---

## 2. Problem Statement

**Current state:** Every response component is validated in isolation. `buildSchema` in `lib/validation.ts` builds a `z.object(...)` where each field's `ZodType` depends only on that field's own configuration. There is no way to express a rule like "this field must be greater than another field's value" or "this field is required only when another field has a specific value".

**Desired state:** Researchers can declare cross-field rules directly on a response component. At submit time, those rules are evaluated against the current form values, with clear, field-level error messages surfaced to the participant.

**Impact:** Any survey with skip logic, range checks, or conditional requirements currently requires workarounds — usually hiding the dependent field behind a `ConditionalComponent` — which does not enforce validation on the hidden/shown field properly and does not support value-comparison rules at all.

---

## 3. User Story

> As a **researcher authoring an experiment**,
> I want to **declare that a field's validity depends on another field's value**,
> so that **participants cannot submit logically inconsistent data without being told why**.

### Scenario A – Conditional required

A screen asks "Do you have children?" (`$hasChildren`, radio: yes/no) and "How many?" (`numberOfChildren`, numeric-input). The researcher wants `numberOfChildren` to be required only when `$hasChildren === "yes"`.

### Scenario B – Comparative range

A screen asks for a start age (`startAge`) and an end age (`endAge`). The researcher wants `endAge` to be greater than `$startAge`.

### Scenario C – Mutual exclusivity

A screen has two text-inputs, `optionA` and `optionB`. At least one must be filled, but not both.

---

## 4. Acceptance Criteria

- [ ] A response component can declare a `crossValidation` array of rules in its config.
- [ ] Each rule has an `operator`, a `dataKey` (pointing to another field on the same screen via `$` prefix), and an optional `errorMessage`.
- [ ] Supported operators: `required-if`, `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`.
- [ ] Rules are evaluated at form submit time using the full form state.
- [ ] A failing rule surfaces its `errorMessage` on the field that declares the rule (not the referenced field).
- [ ] Rules are not evaluated when the component is hidden inside a `ConditionalComponent` whose condition is false.
- [ ] If `errorMessage` is omitted, a sensible default message is shown.
- [ ] Existing per-field validation (`required`, `minLength`, etc.) continues to work as before and is evaluated first.
- [ ] `validateExperiment` warns (warning, not error) if a `crossValidation.dataKey` references a `$key` that does not exist as a `dataKey` on the same screen.
- [ ] All new behavior is covered by unit tests in `lib/specs/validation.test.ts` and integration tests in `src/specs/Screen.test.tsx`.

---

## 5. UI / UX

### 5.1 Entry Point

This is a config-level change. Researchers declare rules in the experiment's TypeScript config — there is no visual UI to design.

### 5.2 Interaction Flow

1. Participant fills out fields on a screen.
2. Participant clicks the next button.
3. `form.handleSubmit` triggers zod validation.
4. Per-field rules run first; cross-field rules run in a `superRefine` pass.
5. Any failing rule adds an error to the field that declared it.
6. Errors are displayed inline below the relevant input, exactly as today.
7. If all rules pass, the screen advances normally.

### 5.3 States

| State | Description |
|---|---|
| Default | Fields render normally; no cross-field rules are visible to the participant. |
| Validation error | The offending field shows its `errorMessage` below the input in the existing `FieldError` style. |
| Hidden field | If the component is inside a `ConditionalComponent` and the condition is false, its cross-field rules are skipped entirely. |

### 5.4 Copy

| Location | String |
|---|---|
| Default `required-if` error | `"This field is required."` |
| Default `gt` / `gte` error | `"This value must be greater than the referenced field."` |
| Default `lt` / `lte` error | `"This value must be less than the referenced field."` |
| Default `eq` error | `"This value must match the referenced field."` |
| Default `neq` error | `"This value must not match the referenced field."` |

### 5.5 Figma Reference

- [ ] Figma link: N/A — error display reuses the existing `FieldError` component.

---

## 6. Technical Notes

### 6.1 Affected Areas

- `lib/components/response.ts` — add `crossValidation?: CrossValidationRule[]` to `ResponseComponentBaseProps`
- `lib/validation.ts` — extend `buildSchema` to emit a `z.superRefine` pass at the object level
- `lib/validate.ts` — add a new check that verifies `$key` references in `crossValidation` resolve to a `dataKey` on the same screen
- `lib/types.ts` — add `CrossValidationRule` type
- `src/specs/Screen.test.tsx` — integration tests for cross-field rule evaluation
- `lib/specs/validation.test.ts` — unit tests for `buildSchema` with `crossValidation`

### 6.2 Data / State

Cross-field rules are evaluated inside a `z.superRefine` callback added to the top-level `z.object(...)` returned by `buildSchema`. Inside `superRefine`, all field values are available. Rules evaluate `formValues[$targetKey]` (stripping the leading `$`) against `formValues[thisField.dataKey]` using the same operator logic already in `lib/conditions.ts:evaluateBaseOperator`. Errors are added via `ctx.addIssue({ path: [dataKey], ... })`.

**`CrossValidationRule` type:**

```ts
type CrossValidationRule = {
  operator: "required-if" | BaseOperator;
  // $-prefixed reference to another field on the same screen
  dataKey: `$${string}`;
  // for required-if: the value the referenced field must have for this field to become required
  // for comparison operators: the referenced field's value is used as the right-hand side
  value?: string | number | boolean;
  errorMessage?: string;
};
```

**`required-if` semantics:**
The field becomes required when `evaluateBaseOperator("eq", referencedValue, rule.value)` is true. If `rule.value` is omitted, the field becomes required whenever the referenced field is truthy (non-empty, non-zero, non-false).

**Comparison operator semantics:**
`evaluateBaseOperator(rule.operator, thisFieldValue, referencedFieldValue)` must return `true` for validation to pass.

### 6.3 Validation

| Rule | Error code | Severity |
|---|---|---|
| `crossValidation[].dataKey` references a `$key` not found as a `dataKey` on the same screen | `invalid-reference` | Warning |

### 6.4 Constraints & Risks

- Cross-field rules can only reference fields on the **same screen** (via `$` prefix). Referencing experiment-level data (`$$`) is deliberately out of scope for this feature — that use case is served by `ConditionalComponent` at the render level or `BranchNode` at the flow level.
- Rules referencing fields inside `ConditionalComponent` or `ForEachComponent` may read `undefined` if the referenced component is not rendered. The `superRefine` pass should treat `undefined` as a falsy value and not throw.
- The order of `crossValidation` rules on a single field is evaluated top-to-bottom; all failing rules add issues (not first-failure-only).

---

## 7. Test Plan

### 7.1 Unit Tests

- [ ] `buildSchema` with `crossValidation: [{ operator: "required-if", dataKey: "$choice", value: "yes" }]` — schema passes when `choice !== "yes"`, fails when `choice === "yes"` and field is empty.
- [ ] `buildSchema` with `crossValidation: [{ operator: "gt", dataKey: "$startAge" }]` — schema fails when `endAge <= startAge`.
- [ ] `buildSchema` with multiple rules on one field — all failing rules add separate issues.
- [ ] `buildSchema` with a `crossValidation` rule and the field is also `required: true` — both rules are checked independently.
- [ ] `validateExperiment` emits `invalid-reference` warning when `crossValidation.dataKey` references a non-existent field on the screen.

### 7.2 Integration / Flow Tests

- [ ] Screen with `required-if`: submitting with the trigger value set and the dependent field empty shows an error on the dependent field.
- [ ] Screen with `required-if`: submitting with the trigger value unset and the dependent field empty passes validation.
- [ ] Screen with `gt`: submitting `endAge < startAge` shows an error on `endAge`.
- [ ] Verified: error message falls back to the default string when `errorMessage` is not set.

### 7.3 Manual / QA Checks

- [ ] Fill a screen partially to trigger a cross-field error; confirm the error appears on the correct field.
- [ ] Fix the error and resubmit; confirm the screen advances.
- [ ] Confirm existing per-field validation (e.g. `required`, `minLength`) is unaffected.

---

## 8. Out of Scope

- Referencing experiment-level data (`$$key`) in cross-field rules — use `BranchNode` for flow-level conditions.
- Cross-screen validation — each screen is validated independently at submission.
- More than two fields in a single rule (e.g., "A + B must be > C") — too complex for the initial iteration.
- Visual builder UI for declaring cross-field rules.

---

## 9. Open Questions

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | Should comparison operators (`gt`, `lt`, etc.) coerce types the same way `evaluateBaseOperator` does (loose equality)? | — | Open |
| 2 | When the referenced field (`$key`) is inside a `ConditionalComponent` that is currently hidden, should the rule be skipped or should it see `undefined`? | — | Open — proposed: skip the rule if the referenced field's component has a false condition |
| 3 | Should `required-if` with no `value` prop treat any truthy reference value as the trigger, or require `value` to be set explicitly? | — | Open |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-03-12 | — | Initial draft |
