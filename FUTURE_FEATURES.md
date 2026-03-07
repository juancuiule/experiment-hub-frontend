# Future Features

## UX

### Scroll to first error on submit
When a required field is invalid and off-screen, the summary message at the bottom tells the user something is wrong but not where. On submit failure, call `scrollIntoView` on the first errored field's element to bring it into view automatically.

### Transition animations between screens
Screens currently replace each other abruptly. A fade or slide transition (Framer Motion or CSS) would improve the survey experience significantly.

### Input type variants
`Input` currently always renders `<input type="text">`. Add `inputType?: "text" | "number" | "email" | "date"` to the `Input` screen type so fields like age (number) or contact email can use the correct HTML input type without needing a new component.

---

## Features

### Conditional components within a screen
Conditional logic is currently only at the screen level (via branch nodes). A `visibleIf?: ConditionConfig` field on any `ScreenComponent` would allow showing or hiding individual fields based on context — e.g. showing a "please specify" text input only when "Other" is checked in a checkbox group.

### Progress persistence
The Zustand store is in-memory only. A page refresh resets the experiment. Adding Zustand `persist` middleware with `sessionStorage` would make the experiment resumable with minimal changes.

### `validateExperiment` used at startup
`lib/validate.ts` exists but is not wired into the app. Call it inside `startExperiment` (or in the store's `start` action) and throw / surface errors clearly so misconfigured experiments fail fast with a readable message instead of a cryptic runtime error.

---

## Data

### Typed context data
`Context.data` is `Record<string, any>`, making `$$key.path` references unverifiable at the type level. A future direction is to derive a typed data schema from the experiment's screen components so that `getValue` is type-safe and typos in key paths are caught at build time.

### Multi-item `currentItem`
The loop's `currentItem` only supports a single active item (`value`, `index`, `loopId`). Nested loops would require a stack of current items. Consider `currentItems: { value, index, loopId }[]` resolved from innermost to outermost.
