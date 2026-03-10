# Code Review

## Critical Bugs

### 1. `validate.test.ts:53` — `"multiple-start"` code is never emitted
`basicChecks` no longer has a multiple-start check (only checks for missing start). The test asserting `codes(flow).toContain("multiple-start")` will always fail.

### 2. `validate.ts:102–123` — `requireEdge` fires on screen nodes, producing spurious `"missing-edge"` errors
`"screen"` is missing from the `requireEdge` map. `requireEdge["screen"]` is `undefined`, so `edge.type === undefined` is never true → every screen node gets a false `missing-edge` error. The "actual experiment has no errors" test would catch this — it's worth verifying if it's currently passing.

### 3. `lib/conditions.ts:18–20` — loose `==`/`!=` for `eq`/`neq`
`"3" == 3` is `true` in JS. Form data is always a string. Any experiment using `{ operator: "eq", value: 3 }` to match a numeric form value will silently coerce instead of comparing strictly. All other operators use `Number()` explicitly.

<!-- ### 4. `Screen.tsx:193–199` — `form.reset()` called on a likely-detached element
After `onNext` resolves, the store updates and React re-renders a new screen. The form is already unmounted before `.then(() => target?.reset())` fires. It's also redundant — the form has `key={screen.slug}` so it remounts fresh anyway. Remove the `.then(...)` call entirely. -->

---

## Important Bugs

### 5. `lib/validation.ts:8–37` — `required` silently ignored for `slider`, `dropdown`, `radio`, `single-checkbox`
`buildSchema` only handles `text-input`, `multiple-check`, and `rating`. The other four response types fall through to `default: return null`. A `required: true` field of any of these types will always pass validation without any input.

### 6. `Slider.tsx:34` — slider always submits a value
`<input type="range">` always has a value (defaults to `min` here). There's no way to detect "user never touched this" vs "user chose the minimum value". Combined with issue 5, required sliders are completely unenforceable.

### 7. `Screen.tsx:25–38` — `extractData` ignores the `"control"` family
If a `ConditionalComponent` wraps a response widget, `extractData` returns `{}` for it (componentFamily is `"control"`, not `"response"`). The wrapped field's value is silently lost on submit.

### 8. `Screen.tsx:47–158` — `"control"`, `"for-each"`, `"group"` silently render nothing
No rendering case for these types. They disappear without any warning. A `console.warn` in a `default` branch would help debug misconfigured screens.

### 9. `validate.ts:217–257` — condition `dataKey` tokens are never checked
`$$path-profile.activities.activities` inside a `BranchNode` config is never validated by `validateReferences`. A forward reference or typo in a condition `dataKey` silently evaluates to `undefined` at runtime, causing wrong branch routing.

### 10. `lib/conditions.ts:72–76` — `length-eq 0` on a missing key returns `true`
`String(undefined ?? "").length === 0` is `true`. A missing `dataKey` is indistinguishable from an empty string, which can cause incorrect branch matching.

---

## Architectural Concerns

<!-- ### 11. `lib/components/response.ts:78–96` — `CheckboxWidget` and `MultipleCheckWidget` are identical
Both have the exact same shape. `Screen.tsx` renders both with the same `<CheckboxGroup>`. No semantic distinction is documented. Any future change to one prop will need to be mirrored manually. -->

### 12. `validate.ts:102–109` — `as Record<...>` cast hides missing keys
The cast suppresses the compile error from the missing `"screen"` key. Adding a new node type won't trigger any warning here.

<!-- ### 13. `store.ts:23–39` — `isLoading: false` duplicated in both branches instead of `finally`
The pattern is copy-pasted for both `start` and `next`. If `set(...)` itself throws, loading state gets stuck at `true`. A `finally` block is cleaner and safer. -->

<!-- ### 14. `lib/utils.ts:16–22` — `send()` adds a real 1-second delay in production
Every checkpoint in the live app blocks for 1 second. This is a dev stub that made it into the live flow. Gate it behind a flag or reduce to a no-op. -->

### 15. `lib/validate.ts` — no check for duplicate `loop-template` edges on a single loop
`getTemplateNode` in `flow.ts` uses `.find()` and silently takes the first match. A misconfigured loop with two template edges would silently ignore one.

---

## Accessibility / UX

### 16. All input components — no `aria-invalid` / `aria-describedby`
Errors are visually shown but not linked to inputs. Screen readers won't associate the error message with the field. Affects `Input`, `Rating`, `CheckboxGroup`, `Dropdown`, `Radio`, `SingleCheckbox`, `Slider`.

### 17. `CheckboxGroup.tsx:12`, `Radio.tsx:13` — group label not associated with inputs
Both use a bare `<span>` as the group question. Should be `<fieldset>`/`<legend>` for screen readers to announce the group context.

### 18. `Dropdown.tsx:19` — placeholder option is selectable and submits as `""`
Without `disabled` on `<option value="">Select…</option>`, users can explicitly re-select the placeholder and submit an empty string. Add `disabled hidden` to it.

### 19. `Rating.tsx:12` — `<p>` used for label; radio group has no `fieldset`/`<legend>`
Same issue as 17. The group question is not programmatically associated with the radio inputs.

---

## Type Safety

<!-- ### 20. `lib/components/control.ts:4,11` — typos: `Compoment` instead of `Component`
Both `BaseControlCompoment` and `ConditionalCompoment` are exported. Fix before the API grows. -->

### 21. `Screen.tsx:50,65` — array index used as `key` for layout/content components
Buttons and rich-text use `key={index}`. Safe for now due to `key={screen.slug}` on the form, but a React anti-pattern. Use `component.id` (already on `BaseComponent`) when present.

---

## Test Coverage Gaps

### 22. No tests for `required` on `slider`/`dropdown`/`radio`/`single-checkbox`
The silent ignore behavior in `buildSchema` is completely untested.

### 23. No test confirming the error summary disappears after a successful submit
`setErrors({})` at `Screen.tsx:191` is untested.

### 24. `validate.test.ts` — no isolated test for the `requireEdge` check
No test to confirm it doesn't fire false positives on screen nodes.

---

## Polish

<!-- ### 25. `lib/screen.ts:4–6` — commented-out `name`/`description` fields with no explanation
Remove or restore with a comment explaining the intent. -->

<!-- ### 26. `src/data/experiment.ts:97` — loop `stepper.label` is never consumed by any UI component
`Stepper` is only rendered for path nodes. The loop stepper config is dead data. -->
