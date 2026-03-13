# Build-Time Screen Reference Validation (`$` prefix)

> **Status:** Draft
> **Author:** —
> **Created:** 2026-03-12
> **Last updated:** 2026-03-12
> **Linked issue:** —

---

## 1. Summary

Extend `validateExperiment` to check `$key` references (screen-scoped data keys) inside `ConditionalComponent` conditions and `crossValidation` rules, so that typos or deleted `dataKey`s are caught at load time rather than silently failing at runtime.

---

## 2. Problem Statement

**Current state:** `validateExperiment` validates `$$` (experiment-level) and `@` (loop iteration) references in component labels and branch conditions, but explicitly skips `$`-prefixed references (see `lib/validate.ts:checkText` — the regex only matches `\$\$[\w.-]+` and `@[\w.]+`). A typo such as `$hascildren` instead of `$hasChildren` in a `ConditionalComponent.props.if.dataKey` silently evaluates to `undefined`, making the condition always false — and the conditional component is never rendered. There is no error, no warning, no indication to the researcher that anything is wrong.

**Desired state:** When `validateExperiment` processes a screen, it collects the set of `dataKey` values declared by response components on that screen, then checks every `$key` reference in that screen's `ConditionalComponent` conditions (and, once implemented, `crossValidation` rules) against that set. Any reference that does not match an existing `dataKey` on the same screen is reported as a warning.

**Impact:** Every researcher who uses conditional show/hide logic on a screen is exposed to this silent failure. The only way to discover it today is to manually test every conditional path of the experiment.

---

## 3. User Story

> As a **researcher authoring an experiment**,
> I want to **be told at load time when a `$key` I reference in a condition doesn't match any field on that screen**,
> so that **I can catch typos and stale references before participants encounter a broken survey**.

### Scenario A – Typo in a conditional

A researcher renames a radio component's `dataKey` from `"hasPets"` to `"ownsPets"` but forgets to update the `ConditionalComponent` that references `$hasPets`. Today: the conditional silently never renders. After this feature: `validateExperiment` emits a warning with the screen slug, the invalid reference, and the set of valid keys.

### Scenario B – Deleted field

A researcher removes a response component from a screen but leaves a `ConditionalComponent` that still references its `dataKey`. Same silent failure as above; same fix.

### Scenario C – Cross-field validation rule with a bad reference

A `crossValidation` rule on a `numeric-input` references `$startAge`, but the other field was renamed to `$startingAge`. The warning tells the researcher exactly which field and which rule has the stale reference.

---

## 4. Acceptance Criteria

- [ ] `validateExperiment` collects the `dataKey` of every **top-level** response component on each screen.
- [ ] It also recursively collects `dataKey`s from response components nested inside `GroupComponent`.
- [ ] For every `ConditionalComponent` on the screen (at any nesting level), it checks `props.if.dataKey` — if it starts with `$`, the referenced key (without the `$`) must exist in the collected set.
- [ ] For every `crossValidation` rule on a response component, it checks `rule.dataKey` the same way.
- [ ] A missing `$` reference emits a `ValidationError` with code `invalid-reference` and severity warning.
- [ ] A `$` reference that resolves to a `dataKey` of a component nested inside a `ConditionalComponent` is accepted (it may be conditionally visible but its `dataKey` is still valid on the screen).
- [ ] Existing `$$` and `@` reference checks are unaffected.
- [ ] New checks are covered by tests in `lib/specs/validate.test.ts`.

---

## 5. UI / UX

### 5.1 Entry Point

`validateExperiment(flow)` is called in `app/page.tsx` on the server during render. Errors and warnings are already displayed in the page as a list. This feature adds new items to that list.

### 5.2 Interaction Flow

1. Researcher edits the experiment config and starts the dev server (or refreshes the page).
2. `validateExperiment` runs.
3. If any `$` references are invalid, warning items appear in the validation output on the page.
4. Each warning identifies: the screen slug, the component id (if set) or its index, and the invalid `$key`.
5. Researcher fixes the reference and refreshes.

### 5.3 States

| State | Description |
|---|---|
| No warnings | Validation passes silently; the experiment loads normally. |
| Warning present | A warning is displayed. The experiment still loads (warnings do not block execution). |

### 5.4 Copy

| Location | String |
|---|---|
| Warning message | `"Screen \"[slug]\": conditional references \"$[key]\" but no response component on this screen has dataKey \"[key]\". Valid keys: [list]."` |
| Warning message (crossValidation) | `"Screen \"[slug]\": crossValidation on \"[dataKey]\" references \"$[key]\" but no response component on this screen has dataKey \"[key]\"."` |

### 5.5 Figma Reference

- [ ] Figma link: N/A — uses existing validation error display.

---

## 6. Technical Notes

### 6.1 Affected Areas

- `lib/validate.ts` — add `checkScreenReferences(screen: FrameworkScreen): ValidationError[]` function; call it from `validateExperiment` for each screen
- `lib/specs/validate.test.ts` — tests for the new check

### 6.2 Data / State

**Algorithm for `checkScreenReferences(screen)`:**

```
1. Collect dataKeys:
   collectDataKeys(components) →
     for each component:
       if it's a response component → add dataKey to set
       if it's a GroupComponent → recurse into props.components
       if it's a ConditionalComponent → recurse into props.component
       if it's a ForEachComponent → recurse into props.component (mark as "dynamic scope")

2. Check references:
   checkComponentRefs(components, dataKeySet) →
     for each component:
       if ConditionalComponent and props.if.dataKey starts with "$":
         strip "$", check against dataKeySet → emit warning if missing
       if response component and crossValidation:
         for each rule where rule.dataKey starts with "$":
           strip "$", check against dataKeySet → emit warning if missing
       recurse into nested components
```

`ForEachComponent` children are also traversed, but `$` references inside a `for-each` template that target the for-each's iteration value (`foreach.value`, `foreach.index`) should be excluded from the check since they are provided by the `for-each` context, not by another response component's `dataKey`. These keys follow the pattern `foreach.*` and can be special-cased.

### 6.3 Validation

| Rule | Error code | Severity |
|---|---|---|
| `$key` in a `ConditionalComponent.props.if.dataKey` does not match any `dataKey` on the same screen | `invalid-reference` | Warning |
| `$key` in a `crossValidation.dataKey` does not match any `dataKey` on the same screen | `invalid-reference` | Warning |

### 6.4 Constraints & Risks

- `dataKey` values on `ForEachComponent` children are resolved at render time using string interpolation (e.g., `"item-@index-name"`). The static check cannot resolve these. The check should skip `$` references that appear inside a `for-each` template that are clearly dynamic (contain `@` or `$$` interpolations themselves).
- A `ConditionalComponent` nested inside another `ConditionalComponent` is valid — the inner component's `$key` is still checked against the screen-level `dataKey` set.
- This check runs at page load. It is not a hot-reload-aware lint step. The dev experience relies on the researcher refreshing the page after an edit.

---

## 7. Test Plan

### 7.1 Unit Tests

- [ ] Screen with a `ConditionalComponent` referencing a valid `$key` — no warning emitted.
- [ ] Screen with a `ConditionalComponent` referencing a `$key` that is a typo — warning with `invalid-reference` emitted.
- [ ] Screen with a `ConditionalComponent` inside a `GroupComponent`, referencing a valid `$key` from the same screen — no warning.
- [ ] Screen with a `ConditionalComponent` referencing a `$key` of a field that is itself inside another `ConditionalComponent` — no warning (the key is valid on the screen, even if its component is conditionally rendered).
- [ ] Screen with a `crossValidation` rule referencing a valid `$key` — no warning.
- [ ] Screen with a `crossValidation` rule referencing an invalid `$key` — warning emitted.
- [ ] Screen with no conditional components — no warnings.
- [ ] Existing `$$` and `@` reference tests are unaffected.

### 7.2 Integration / Flow Tests

- [ ] Full experiment with a conditional that has a valid reference loads without warnings.
- [ ] Full experiment with a conditional that has a stale reference loads with a warning but does not crash.

### 7.3 Manual / QA Checks

- [ ] Introduce a deliberate typo in a `ConditionalComponent` `dataKey` and verify the warning appears in the page at load time.
- [ ] Fix the typo and verify the warning disappears.

---

## 8. Out of Scope

- Validating `$$` or `@` references in `ConditionalComponent` conditions — these are already handled by the existing `checkReferences` pass in `lib/validate.ts`.
- Hot-reload or IDE lint integration.
- Validating `$` references in component label strings (e.g. `label: "Hello $name"`) — those are not parsed by the current `resolveValuesInString` function and would need a separate feature.
- Strict type-checking of the referenced field's data type vs. the operator used (e.g. ensuring `gt` is not applied to a string field).

---

## 9. Open Questions

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | Should a missing `$` reference be an error (blocking) or a warning (non-blocking)? | — | Proposed: warning — the experiment can still run, the conditional just never shows. |
| 2 | Should `foreach.value` and `foreach.index` be added to the collected `dataKey` set automatically when inside a `ForEachComponent`? | — | Open |
| 3 | Should this check also validate `$` references in component `label` strings (e.g. inside `resolveString`)? | — | Out of scope for this iteration. |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-03-12 | — | Initial draft |
