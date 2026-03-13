# Response Timing

> **Status:** Draft
> **Author:** —
> **Created:** 2026-03-12
> **Last updated:** 2026-03-12
> **Linked issue:** —

---

## 1. Summary

Record per-screen entry and submission timestamps in `Context`, making response timing data available to researchers for reaction time studies, attention detection, and analysis of screen-level engagement.

---

## 2. Problem Statement

**Current state:** Timing data is limited to checkpoint timestamps (`context.checkpoints[name]: string`) recorded in `lib/flow.ts:342-353`. No per-screen entry time or submission time is ever recorded. The `traverse()` and store `next()` action carry no timestamps.

**Desired state:** For every screen the participant visits, the experiment records when the screen was first shown (`enteredAt`) and when the participant submitted it (`submittedAt`). This data is stored in `Context` alongside the response data and included in `send()` payloads.

**Impact:** Researchers running reaction time studies, cognitive load experiments, or attention quality checks have no per-screen timing data today. They can only bracket time between checkpoint nodes — a coarse approximation that covers whole sections, not individual questions.

---

## 3. User Story

> As a **researcher running a reaction time experiment**,
> I want to **know how long each participant spent on each screen**,
> so that **I can use response latency as a dependent variable in my analysis**.

### Scenario A – Reaction time measurement

A screen shows an emotional image stimulus for 2 seconds (via a timed screen feature), then a response screen asks the participant to rate their emotional reaction. The researcher needs `enteredAt` and `submittedAt` for the response screen to compute reaction latency.

### Scenario B – Attention quality filtering

A researcher filters out participants who spent less than 2 seconds on any screen as potential speeding (careless responding).

### Scenario C – Screens inside loops

A participant iterates through a loop of 5 image stimuli, each on its own screen. The researcher needs timing for each iteration disambiguated by loop index, not just by screen slug.

---

## 4. Acceptance Criteria

- [ ] `Context` has a new `timings` field: `{ [key: string]: { enteredAt: string; submittedAt: string } }`.
- [ ] The timing key uses the same nesting convention as `context.data` — `dataPath + "/" + slug` — so loop/path screens are disambiguated by their position in the flow.
- [ ] `enteredAt` is recorded as an ISO 8601 timestamp when the store transitions to a new screen-type state.
- [ ] `submittedAt` is recorded as an ISO 8601 timestamp in `store.next()` immediately before calling `traverse()`.
- [ ] Timing data is included in the `send()` payload on every checkpoint and final submission.
- [ ] Auto-traversed nodes (start, branch, fork, checkpoint) are not included in `timings` — only `screen` nodes.
- [ ] Timing data is persisted alongside `step` when session persistence is enabled.
- [ ] Unit tests cover entry time recording, submission time recording, and loop/path key disambiguation.

---

## 5. UI / UX

No participant-facing UI changes. Timing data is purely a backend/research output.

---

## 6. Technical Notes

### 6.1 Affected Areas

- `lib/types.ts` — add `timings?: Record<string, { enteredAt: string; submittedAt: string }>` to `Context`
- `src/data/store.ts` — record `enteredAt` when `step` changes to a screen state; record `submittedAt` in `next()` before calling `traverse()`
- `lib/flow.ts` — `traverse()` should return the timing key for the current screen as part of the updated step, or the store derives it from `step.dataPath + step.state.node.props.slug`

### 6.2 Data / State

**Timing key construction:**

```ts
function buildTimingKey(step: FlowStep): string | null {
  const inner = getActiveState(step.state);
  if (inner.type !== "in-node") return null;
  const node = inner.node;
  if (node.type !== "screen") return null;
  const prefix = step.dataPath ? `${step.dataPath}/` : "";
  return `${prefix}${node.props.slug}`;
}
```

**Recording `enteredAt`:** The store should subscribe to its own `step` changes (via `subscribe` in Zustand) and record `enteredAt` whenever the key changes to a new screen. Alternatively, `enterStep()` in `lib/flow.ts:93-121` can return a suggested timing key, and the store applies the timestamp.

**Recording `submittedAt`:** In `store.next()`, before calling `traverse(step, data)`, compute the current screen's timing key and write `context.timings[key].submittedAt = new Date().toISOString()`. Then pass the updated context into `traverse`.

**Duration computation:** Not computed on the client — researchers derive `submittedAt - enteredAt` server-side or in analysis scripts. The client records only raw ISO timestamps.

### 6.3 Validation

No `validateExperiment` changes.

### 6.4 Constraints & Risks

- Browser tab visibility: if a participant leaves the tab open but walks away, `submittedAt - enteredAt` will be inflated. The Page Visibility API can be used to track active time vs. total elapsed time, but this is out of scope for the initial implementation.
- Clock skew: `Date.now()` / `new Date().toISOString()` uses the client clock, which can be manipulated. Server-side timestamping at the `send()` endpoint is more reliable for high-stakes timing data.
- Re-visiting screens via back navigation: if a participant goes back to a screen and resubmits, the timing entry should be **updated** (not duplicated). Using the timing key as a dictionary key ensures only the latest visit is retained. If all visits are needed, the value type should be an array: `{ entries: Array<{ enteredAt: string; submittedAt: string }> }`.

---

## 7. Test Plan

### 7.1 Unit Tests

- [ ] `buildTimingKey(step)` returns `"slug"` for a top-level screen.
- [ ] `buildTimingKey(step)` returns `"pathId/slug"` for a screen inside a path.
- [ ] `buildTimingKey(step)` returns `"loopId/value/slug"` for a screen inside a loop iteration.
- [ ] `store.next()` writes `submittedAt` before calling `traverse()`.
- [ ] `enteredAt` is recorded when step transitions to a new screen node.
- [ ] Back navigation updates the `enteredAt` for the re-visited screen.

### 7.2 Integration / Flow Tests

- [ ] Complete a 3-screen sequence — `context.timings` has 3 entries, each with valid ISO timestamps.
- [ ] `submittedAt >= enteredAt` for every entry.
- [ ] Loop with 3 iterations — 3 disambiguated timing entries exist.

### 7.3 Manual / QA Checks

- [ ] Complete experiment and inspect submitted data — timing keys appear correctly nested.
- [ ] Verify timestamps are in ISO 8601 format.

---

## 8. Out of Scope

- Active vs. idle time tracking (Page Visibility API).
- Per-component interaction timestamps (e.g., first slider touch, first keystroke).
- Server-side authoritative timestamps.
- Configurable timing resolution (ms vs. s).

---

## 9. Open Questions

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | Should back-navigation overwrite or append timing entries? | — | Proposed: overwrite — only the final submission counts for analysis. |
| 2 | Should timing data live inside `context.data` (alongside response values) or in a separate `context.timings` namespace? | — | Proposed: separate `context.timings` to avoid collisions with `dataKey`-named fields. |
| 3 | Should millisecond-precision timestamps be used instead of ISO strings? | — | Open — ISO strings are human-readable; ms numbers are easier to diff. |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-03-12 | — | Initial draft |
