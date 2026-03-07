# Future Features

## 1. Scroll to first error on submit
When a required field is invalid and off-screen, the summary message at the bottom tells the user something is wrong but not where. On submit failure, call `scrollIntoView` on the first errored field's element to bring it into view automatically.

## 2. Conditional components within a screen
Conditional logic is currently only at the screen level (via branch nodes). A `visibleIf?: ConditionConfig` field on any `ScreenComponent` would allow showing or hiding individual fields based on context — e.g. showing a "please specify" text input only when "Other" is checked in a checkbox group.

## 3. `validateExperiment` used at startup
`lib/validate.ts` exists but is not wired into the app. Call it inside `startExperiment` (or in the store's `start` action) and throw / surface errors **clearly** so misconfigured experiments fail fast with a readable message instead of a cryptic runtime error.

---

## Data

## 4. Multi-item `currentItem`
The loop's `currentItem` only supports a single active item (`value`, `index`, `loopId`). Nested loops would require a stack of current items. Consider `currentItems: { value, index, loopId }[]` resolved from innermost to outermost.
