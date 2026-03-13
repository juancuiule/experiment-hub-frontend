# [Feature Name]

> **Status:** Draft | In Review | Approved | Implemented
> **Author:** [Name]
> **Created:** YYYY-MM-DD
> **Last updated:** YYYY-MM-DD
> **Linked issue:** [#123](https://github.com/...)

---

## 1. Summary

<!-- One or two sentences. What does this feature do and why does it exist? -->

[One-line description of the feature and its purpose.]

---

## 2. Problem Statement

<!-- What is broken, missing, or painful today? Be specific about the gap between the current state and the desired state. -->

**Current state:** [Describe what happens today, or what is missing.]

**Desired state:** [Describe what should happen once this feature is implemented.]

**Impact:** [Who is affected, and how often? e.g. "Researchers who use dynamic loops cannot currently..."]

---

## 3. User Story

<!-- Write from the perspective of the person who will use this feature. -->

> As a **[researcher / participant / admin]**,
> I want to **[do something]**,
> so that **[I get this outcome / value]**.

### Scenario(s)

<!-- Optional: list concrete scenarios that illustrate the story. -->

- **Scenario A – [Happy path name]:** [Description of the most common use case.]
- **Scenario B – [Edge case name]:** [Description of a relevant edge case or variation.]
- **Scenario C – [Error case name]:** [Description of what happens when something goes wrong.]

---

## 4. Acceptance Criteria

<!-- Unambiguous, testable conditions. Each item should be independently verifiable. -->
<!-- Use "Given / When / Then" or a plain checklist — pick one and be consistent. -->

- [ ] Given [initial state], when [action], then [observable outcome].
- [ ] Given [initial state], when [action], then [observable outcome].
- [ ] Given [initial state], when [action], then [observable outcome].
- [ ] [Edge case]: [expected behavior].
- [ ] [Error case]: [expected error state or message].

---

## 5. UI / UX

<!-- Describe the visual and interaction design. Reference Figma links or screenshots where available. -->

### 5.1 Entry Point

[Where does the user access this feature? e.g. a new button in the toolbar, a new node type in the editor, a new config prop.]

### 5.2 Interaction Flow

1. [Step 1 — what the user sees / does first.]
2. [Step 2 — what happens next.]
3. [Step 3 — final state / confirmation.]

### 5.3 States

| State | Description |
|---|---|
| Default | [What the component looks like in its resting state.] |
| Loading / In progress | [If applicable — what indicates async work is happening.] |
| Success | [What confirms the action completed.] |
| Empty | [What is shown when there is no data.] |
| Error | [How errors surface to the user.] |
| Disabled | [When and why the control is non-interactive.] |

### 5.4 Copy

<!-- List all user-facing strings. Keeping copy here prevents inconsistencies and makes i18n easier later. -->

| Location | String |
|---|---|
| [Button label / heading / placeholder / error message] | `"[Exact copy]"` |
| [Button label / heading / placeholder / error message] | `"[Exact copy]"` |

### 5.5 Figma Reference

- [ ] Figma link: [URL or "Not yet designed"]
- [ ] Responsive behaviour documented: Yes / No / N/A

---

## 6. Technical Notes

<!-- High-level guidance for the implementer. Not a full design doc — just enough to avoid known pitfalls. -->

### 6.1 Affected Areas

<!-- List the files, modules, or layers most likely to change. -->

- `lib/[relevant-file].ts` — [why it will change]
- `src/components/[component].tsx` — [why it will change]
- `lib/types.ts` — [new types or changes to existing ones]

### 6.2 Data / State

<!-- How is data produced, stored, and consumed? Reference existing patterns (dataKey, context, flow state, etc.) -->

[Describe what data this feature reads and writes, and where it lives in the experiment state or config.]

### 6.3 Validation

<!-- What new validation rules does this introduce? Map to error codes if applicable. -->

| Rule | Error code | Severity |
|---|---|---|
| [Description of the rule] | `[error-code]` | Error / Warning |

### 6.4 Constraints & Risks

<!-- Known technical constraints, performance considerations, or things that could go wrong. -->

- [Constraint or risk 1]
- [Constraint or risk 2]

---

## 7. Test Plan

<!-- What needs to be tested? Separate concerns clearly. -->

### 7.1 Unit Tests

- [ ] [Function or module]: [what to assert]
- [ ] [Function or module]: [what to assert]

### 7.2 Integration / Flow Tests

- [ ] [Scenario]: [expected traversal or render outcome]
- [ ] [Scenario]: [expected traversal or render outcome]

### 7.3 Manual / QA Checks

- [ ] [Check performed in the browser or experiment runner]
- [ ] [Check performed in the browser or experiment runner]

---

## 8. Out of Scope

<!-- Be explicit about what this spec deliberately does NOT address, to prevent scope creep. -->

- [Thing that is intentionally excluded and why.]
- [Thing that is intentionally excluded and why.]

---

## 9. Open Questions

<!-- Unresolved decisions that need an answer before or during implementation. -->

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | [Question] | [Name / TBD] | [Answer, or "Open"] |
| 2 | [Question] | [Name / TBD] | [Answer, or "Open"] |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| YYYY-MM-DD | [Name] | Initial draft |
