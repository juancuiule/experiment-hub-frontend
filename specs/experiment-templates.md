# Experiment Templates & Starter Configs

> **Status:** Draft
> **Author:** —
> **Created:** 2026-03-12
> **Last updated:** 2026-03-12
> **Linked issue:** —

---

## 1. Summary

Ship a set of curated starter `ExperimentFlow` configs that demonstrate each major structural pattern (linear, branching, randomized path, dynamic loop), so new researchers can start from a working example instead of a blank file.

---

## 2. Problem Statement

**Current state:** The codebase contains one experiment config in `src/data/experiment.ts`. The first ~345 lines are a more complex wellness survey that is entirely commented out, with no explanation of why. The active config is a real psychedelics study written in Spanish, which is a poor onboarding surface for a new researcher trying to understand how to structure their own experiment.

`store.ts:22` and `app/page.tsx:3` both hardcode a single import from `src/data/experiment`. There is no mechanism to load, browse, or switch between configs.

**Desired state:** A `src/data/templates/` directory contains 4–5 annotated starter configs covering the most common experiment structures. The `/editor` and `/preview` routes (when built) can load any template as a starting point. For now, researchers copy-paste or import the template they need.

**Impact:** A researcher starting a new experiment today must either (a) read the full active config and strip out irrelevant parts, or (b) read the docs and construct a config from scratch. Both paths are slow and error-prone. Good templates reduce the time to first working experiment from hours to minutes.

---

## 3. User Story

> As a **researcher starting a new experiment**,
> I want to **choose a template that matches my study design**,
> so that **I have a working, annotated starting point instead of a blank config**.

### Scenario A – Simple linear survey

A researcher needs 5 screens in sequence with no branching. They copy `simple-survey.ts`, rename the screen slugs, and add their components. The template already has the correct start node, sequential edges, and screen definitions.

### Scenario B – Branching on a screening question

A researcher needs to route participants to different tracks based on an eligibility question. They start from `branching-survey.ts`, which shows a `branch` node with two arms, each leading to different screen sequences.

### Scenario C – Randomized block design

A researcher needs to counterbalance the order of 3 stimulus screens across participants. They start from `randomized-path.ts`, which shows a `path` node with `randomized: true` and three child screens.

### Scenario D – Repeated measures with a loop

A researcher needs to show the same rating screen for each item in a participant-defined list. They start from `loop-survey.ts`, which shows a `dynamic` loop over a checkboxes response.

---

## 4. Acceptance Criteria

- [ ] A `src/data/templates/` directory exists with at least 4 files: `simple-survey.ts`, `branching-survey.ts`, `randomized-path.ts`, `loop-survey.ts`.
- [ ] Each template exports a named `ExperimentFlow` constant.
- [ ] Each template passes `validateExperiment` with zero errors.
- [ ] Each template file has inline comments on every non-obvious field, cross-referencing the relevant `docs/` file.
- [ ] Each template uses placeholder screen slugs and `dataKey`s that are clearly named as examples (e.g., `"example-screen"`, `"example-rating"`).
- [ ] A `src/data/templates/index.ts` exports all templates in a named map for use by the editor and preview routes.
- [ ] The existing `src/data/experiment.ts` is not changed.

---

## 5. Template Designs

### `simple-survey.ts` — Linear, no branching

```
[start] → [screen: intro] → [screen: questions] → [checkpoint: submitted] → [screen: thank-you]
```

- 1 start node, 1 checkpoint, 3 screen nodes
- 4 sequential edges
- 3 screen definitions, each with 2–3 representative response components
- Annotates: start node, sequential edges, checkpoint, screen slug matching

### `branching-survey.ts` — Eligibility screening with two arms

```
[start] → [screen: screening] → [branch: eligible?]
  → [branch-condition: yes] → [screen: main-study] → [screen: thank-you-participant]
  → [branch-default]        → [screen: thank-you-screened-out]
```

- Demonstrates: `branch` node, `branch-condition` and `branch-default` edges, composite `from` ID syntax
- The branch condition uses `$$screening.qualifies` to route on a `radio` response
- Annotates: the composite `from: "branch-id.arm-id"` syntax, the difference between `branch-default` and `branch-condition`, condition `dataKey` path construction

### `randomized-path.ts` — Counterbalanced stimulus block

```
[start] → [screen: instructions] → [path: stimulus-block (randomized)]
  → [path-contains: screen: stimulus-a (order 0)]
  → [path-contains: screen: stimulus-b (order 1)]
  → [path-contains: screen: stimulus-c (order 2)]
→ [screen: debrief]
```

- Demonstrates: `path` node with `randomized: true`, `path-contains` edges with `order`, stepper config
- Annotates: how `order` is ignored when `randomized: true`, how the stepper label template works, the sequential exit edge after the path

### `loop-survey.ts` — Dynamic loop over a collected list

```
[start] → [screen: activity-list (checkboxes: activities)] → [loop: per-activity (dynamic, dataKey: $$intro.activities)]
  → [loop-template: screen: activity-rating]
→ [screen: thank-you]
```

- Demonstrates: `dynamic` loop node, `loop-template` edge, `@value` reference in screen labels, `dataKey` construction for the loop's source data
- Annotates: how `dataKey` in the loop references the checkboxes response, how `@value` and `@index` resolve inside the template screen, the sequential exit edge after the loop

---

## 6. UI / UX

### 6.1 Entry Point (immediate)

Templates are files in `src/data/templates/`. Researchers discover them by browsing the repository. No UI is needed for the initial implementation.

### 6.2 Entry Point (with editor/preview)

The `/preview` index page shows a "Templates" section. Clicking a template card opens it in the preview, allowing the researcher to step through the template flow before deciding to use it. The visual builder's "New experiment" dialog shows the same template cards.

---

## 7. Technical Notes

### 7.1 Affected Areas

- `src/data/templates/simple-survey.ts` — new file
- `src/data/templates/branching-survey.ts` — new file
- `src/data/templates/randomized-path.ts` — new file
- `src/data/templates/loop-survey.ts` — new file
- `src/data/templates/index.ts` — re-exports all templates

### 7.2 Validation

Each template must be validated in CI:

```ts
// src/data/templates/__tests__/templates.test.ts
import { templates } from "../index";
import { validateExperiment } from "../../../lib/validate";

for (const [name, flow] of Object.entries(templates)) {
  it(`template "${name}" passes validateExperiment`, () => {
    expect(validateExperiment(flow)).toEqual([]);
  });
}
```

This ensures templates never drift into an invalid state as the schema evolves.

### 7.3 Constraints & Risks

- Template screen slugs must not conflict with the active experiment's slugs if both are ever loaded together (e.g., in the editor). Using a `template-` prefix on all slugs (e.g., `"template-intro"`) prevents collisions.
- Templates use simple English labels and placeholder data to remain readable by researchers whose primary language may not be Spanish (unlike the current live config).
- The `loop-survey` template's `dataKey` for the loop must exactly match the screen slug and `dataKey` of the checkboxes component — the annotation should make this dependency explicit with a concrete example of the resulting fully-qualified path.

---

## 8. Test Plan

### 8.1 Unit Tests

- [ ] Each template passes `validateExperiment` with zero errors.
- [ ] Each template's `ExperimentFlow` can be serialized and deserialized from JSON without data loss.

### 8.2 Manual / QA Checks

- [ ] Load each template into the live experiment runner (by temporarily replacing the `experiment` import) and walk through it end to end.
- [ ] Confirm the inline comments accurately describe each field.
- [ ] Confirm the `branching-survey` template routes correctly for both the `yes` and `no` (default) arms.

---

## 9. Out of Scope

- A UI for loading or switching templates without code changes (requires the editor/preview integration).
- Templates for every possible node type combination.
- Internationalized templates.
- A template marketplace or user-contributed templates.

---

## 10. Open Questions

| # | Question | Owner | Resolution |
|---|---|---|---|
| 1 | Should templates include sample screen components, or just the flow skeleton (nodes + edges, empty screens)? | — | Proposed: include simple but complete components so the researcher can run the template end to end without adding anything. |
| 2 | Should the commented-out wellness survey in `experiment.ts` (lines 18–345) be extracted into a template instead? | — | Open — it is a good example but is in Spanish and uses real study data. A clean English rewrite is preferable. |
| 3 | Should templates be validated in the existing test suite or in a separate CI step? | — | Proposed: add to the existing Vitest suite as a new `src/data/templates/__tests__/templates.test.ts` file. |

---

## 10. Changelog

| Date | Author | Change |
|---|---|---|
| 2026-03-12 | — | Initial draft |
