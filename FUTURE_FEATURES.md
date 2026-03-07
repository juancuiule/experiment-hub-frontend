# Future Features

## 1. Scroll to first error on submit
When a required field is invalid and off-screen, the summary message at the bottom tells the user something is wrong but not where. On submit failure, call `scrollIntoView` on the first errored field's element to bring it into view automatically.

## 2. `Conditional` higher-order component
A component that mirrors the branch node but at the screen level. It holds a `condition: ConditionConfig`, a `then: ScreenComponent[]`, and an optional `else: ScreenComponent[]`. The renderer evaluates the condition against the current context and renders the appropriate children — e.g. showing a "please specify" input only when "Other" is checked, without needing a separate screen or branch node.

```ts
{ type: "conditional", condition: { operator: "contains", dataKey: "@value", value: "other" }, then: [{ type: "input", dataKey: "specify", label: "Please specify" }] }
```

## 2a. `ForEach` higher-order component
Mirrors the loop node but renders its template children inline within the same screen, once per item in a list. Useful for rating a small fixed set of sub-items without navigating away. Props mirror the loop node: `type: "static" | "dynamic"`, `values` or `dataKey`, and `template: ScreenComponent[]`. The `@value` / `@index` tokens work the same way inside template children.

```ts
{ type: "for-each", dataKey: "$$activities.selected", template: [{ type: "rating", dataKey: "score-@value", label: "Rate @value", scale: 5 }] }
```

## 2b. `Group` component
A structural component that holds `children: ScreenComponent[]` with no logic of its own — purely for layout and semantic grouping. Supports an optional `label` (rendered as a fieldset legend or section heading) and `layout: "vertical" | "horizontal"` for side-by-side fields. Works naturally with `Conditional` and `ForEach` as their template children can themselves be groups.

## 3. `validateExperiment` used at startup
`lib/validate.ts` exists but is not wired into the app. Call it inside `startExperiment` (or in the store's `start` action) and throw / surface errors **clearly** so misconfigured experiments fail fast with a readable message instead of a cryptic runtime error.

## 4. Experiment completion handler
When the flow has no more nodes the store sets `step: null`, but there is no way to distinguish "not started" from "finished". An `onComplete` callback (or a dedicated `{ type: "end" }` state exposed to the UI) would let the app show a thank-you screen or redirect.

## 5. `defaultValue` on `Input` / `Select`
Pre-populate a field from context, e.g. `defaultValue: "$$welcome.name"` to carry a previously entered value into a later screen without making the user retype it.

---

## New components

## 6. `Select`
A `<select>` dropdown for single-choice questions with many options. Same `options` shape as `CheckboxGroup`, fits as `type: "select"`. Cleaner than a radio list when there are more than ~5 choices.

## 7. `Textarea`
Open-ended long-form responses. Same props as `Input` but renders `<textarea>` with an optional `rows?`. Useful for "please explain your answer" fields.

## 8. `Slider`
Alternative to `Rating` for numeric scales. `min`, `max`, `step` props. Better UX for continuous ranges (e.g. 0–100) where discrete radio buttons feel awkward.

---

## Validation options

`buildSchema` currently only supports `required`. Each component type has natural constraints that map directly to Zod rules and should be expressible in the config:

| Component | New fields | Zod equivalent |
|---|---|---|
| `Input` (type number) | `min?: number`, `max?: number` | `z.coerce.number().min().max()` |
| `Input` (type text / textarea) | `minLength?: number`, `maxLength?: number` | `z.string().min().max()` |
| `Input` (type email) | _(no new field — inferred from `inputType`)_ | `z.string().email()` |
| `CheckboxGroup` | `minSelect?: number`, `maxSelect?: number` | `z.array().min().max()` |
| `Rating` / `Slider` | `min`, `max` already define the range; no extra config needed — schema validates the value is within `[min, max]` | `z.coerce.number().min().max()` |
| `Textarea` | `minLength?: number`, `maxLength?: number` | same as `Input` text |

`inputType: "email"` can automatically attach `.email()` in `buildSchema` without any extra config field, since the intent is already declared. Number inputs should coerce the string from `FormData` to a number before validating range.

---

## Data

## 9. Multi-item `currentItem`
The loop's `currentItem` only supports a single active item (`value`, `index`, `loopId`). Nested loops would require a stack of current items. Consider `currentItems: { value, index, loopId }[]` resolved from innermost to outermost.
