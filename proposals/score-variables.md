# Proposal: Score Variables

## Inspiration
Typeform's Score variable, Qualtrics' embedded data fields with arithmetic, and every
quiz platform that computes a running total. Behavioral researchers frequently need to
compute a composite score (e.g., PHQ-9 depression scale, NPS) from multiple Likert items
spread across screens.

## Problem

There is no mechanism to define computed values that accumulate or transform collected
data as the participant progresses. Currently:

- Researchers must post-process raw `context.data` server-side.
- Branch conditions that depend on a total score (e.g., "if anxiety_score > 10 → show
  clinical referral screen") cannot be expressed because no such aggregate exists in
  `context` at branch evaluation time.

---

## Proposed Design

### 1. Score variable definition on the flow

```ts
// lib/types.ts

export type ScoreVariable = {
  name: string;             // accessible as $$scores.name
  initialValue: number;
  rules: ScoreRule[];
};

export type ScoreRule = {
  /** Evaluated against context after each screen submission. */
  when: ConditionConfig;
  /** Arithmetic operation applied to the current score value. */
  operation: "add" | "subtract" | "multiply" | "set";
  /** A numeric literal or a data key resolving to a number. */
  value: number | `$$${string}` | `$${string}`;
};

export type ExperimentFlow = {
  // ...existing fields...
  scores?: ScoreVariable[];
};
```

### 2. Score update in `traverse`

After writing screen data to `context.data` and before `send()`, evaluate all score
rules whose `when` condition is satisfied by the updated context:

```ts
// lib/flow.ts — inside traverseInNode (screen case)

const updatedContext = writeScreenData(context, data, dataPath, screen.slug);
const scoredContext  = applyScoreRules(updatedContext, experiment.scores ?? []);
await send(scoredContext);
```

```ts
// lib/scores.ts

export function applyScoreRules(context: Context, scores: ScoreVariable[]): Context {
  let ctx = context;
  for (const score of scores) {
    let current = (ctx.data?.scores?.[score.name] as number) ?? score.initialValue;
    for (const rule of score.rules) {
      if (!evaluateCondition(rule.when, ctx)) continue;
      const operand = typeof rule.value === "number"
        ? rule.value
        : Number(getValue(ctx, rule.value) ?? 0);
      switch (rule.operation) {
        case "add":      current += operand; break;
        case "subtract": current -= operand; break;
        case "multiply": current *= operand; break;
        case "set":      current  = operand; break;
      }
    }
    ctx = mergeContext(ctx, { data: { scores: { [score.name]: current } } });
  }
  return ctx;
}
```

Score values are stored at `context.data.scores.<name>`, so they are accessible in
branch conditions as `$$scores.<name>`.

### 3. Usage example — PHQ-9 depression screener

```ts
scores: [
  {
    name: "phq9",
    initialValue: 0,
    rules: [
      // Each Likert item is 0–3; add the selected value directly
      { when: { operator: "gte", dataKey: "$$phq.q1", value: 0 }, operation: "add", value: "$$phq.q1" },
      { when: { operator: "gte", dataKey: "$$phq.q2", value: 0 }, operation: "add", value: "$$phq.q2" },
      // ... q3–q9 ...
    ],
  },
],

// Branch node later in the flow:
{
  id: "branch-severity",
  type: "branch",
  props: {
    branches: [
      { id: "severe",   config: { operator: "gte", dataKey: "$$scores.phq9", value: 20 } },
      { id: "moderate", config: { operator: "gte", dataKey: "$$scores.phq9", value: 10 } },
      { id: "mild",     config: { operator: "lt",  dataKey: "$$scores.phq9", value: 10 } },
    ],
  },
}
```

### 4. Validator additions

- `score-name-collision` — two score variables share the same name
- `score-rule-unknown-key` — `when.dataKey` references a screen that doesn't exist

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | `ScoreVariable`, `ScoreRule`, extend `ExperimentFlow` |
| `lib/scores.ts` | New file: `applyScoreRules` |
| `lib/flow.ts` | Call `applyScoreRules` after each screen submission |
| `lib/validate.ts` | New score validation codes |
| `lib/specs/scores.test.ts` | New test suite |

---

## Open Questions

- Should score rules fire on every screen or only on screens the researcher explicitly
  tags? Filtering avoids unnecessary condition checks in large flows.
- Should score history (value after each screen) be recorded, or only the final value?
- Should negative scores be allowed, and should there be `min`/`max` clamp props?
