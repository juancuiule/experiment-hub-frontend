# Proposal: Attention Checks

## Inspiration

Gorilla SC, Qualtrics, and Prolific's attention-check templates. Inattentive participants corrupt data. The standard technique is to embed one or more "trick" questions with known correct answer — e.g., "Please select 'Strongly disagree' for this item" — and flag or redirect participants who fail.

## Problem

Nothing in the current flow prevents inattentive responses. Researchers must add manual branches checking specific answer values, which is verbose and not obviously an attention check to someone reading the flow definition.

---

## Proposed Design

### 1. `attention-check` node type

```ts
// lib/nodes.ts

export interface AttentionCheckNode extends BaseNode<"attention-check"> {
  props: {
    name: string;
    /** The screen slug that contains the check question. */
    screenSlug: string;
    /** The dataKey of the response component on that screen. */
    dataKey: string;
    /** The correct answer value the participant must provide. */
    expectedValue: string | number;
    /** What to do on failure. */
    onFail: "flag" | "redirect" | "end";
    /** Node to redirect to on failure (required when onFail === "redirect"). */
    redirectNodeId?: string;
    /** Max allowed failures before triggering onFail (default: 1). */
    maxFailures?: number;
  };
}
```

### 2. Engine behavior (`traverseInNode`)

When entering an `attention-check` node, the engine:

1. Reads `context.data[screenSlug][dataKey]` (or the relevant path).
2. Compares it to `expectedValue`.
3. Records the result in `context.attentionChecks[name]`.
4. If the failure count exceeds `maxFailures`:
   - `"flag"` — sets `context.flags.inattentive = true`, continues flow normally.
   - `"redirect"` — routes to `redirectNodeId`.
   - `"end"` — terminates the flow with a specific end reason.

```ts
// lib/types.ts — extend Context
attentionChecks?: {
  [checkName: string]: { passed: boolean; attempts: number };
};
flags?: {
  inattentive?: boolean;
  [key: string]: boolean | undefined;
};
```

### 3. Attention-check screen component (alternative approach)

For platforms that embed checks within existing screens rather than as dedicated nodes,
add an `attentionCheck` prop to any response component:

```ts
// lib/components/response.ts — extend base response props
attentionCheck?: {
  expectedValue: string | number;
  failureMessage?: string;  // shown inline if wrong answer submitted
};
```

This approach shows an error message immediately (like a validation error) rather than
routing through a separate node. The two approaches are complementary.

### 4. Usage example (node approach)

```ts
nodes: [
  // ...
  { id: "ac-1", type: "attention-check", props: {
      name: "mid-survey-check",
      screenSlug: "attention-screen",
      dataKey: "check_answer",
      expectedValue: "strongly_disagree",
      onFail: "redirect",
      redirectNodeId: "screen-ineligible",
      maxFailures: 1,
  }},
  // ...
],
edges: [
  seq("screen-check-question", "ac-1"),
  seq("ac-1", "screen-next"),
]
```

### 5. Researcher reporting

`context.attentionChecks` is sent at each checkpoint via `send()`. The backend can
filter participants with `flags.inattentive = true` during analysis.

### 6. Validator additions

- `attention-check-missing-screen` — `screenSlug` not found in `screens[]`
- `attention-check-missing-key` — `dataKey` not found on the named screen's components
- `attention-check-redirect-missing` — `onFail: "redirect"` but no `redirectNodeId`

---

## Affected Files

| File                                    | Change                                           |
| --------------------------------------- | ------------------------------------------------ |
| `lib/nodes.ts`                          | Add `AttentionCheckNode`                         |
| `lib/types.ts`                          | Extend `Context` with `attentionChecks`, `flags` |
| `lib/flow.ts`                           | Handle `attention-check` in `traverseInNode`     |
| `lib/validate.ts`                       | Three new validation codes                       |
| `lib/specs/flow/flow.attention.test.ts` | New test suite                                   |

---

## Open Questions

- Should failed attention checks be visible to participants (immediate error) or
  invisible (silent flag + redirect after the fact)?
- Should there be a `honeypot` variant — a question that should be left blank — to
  detect bots that fill every field?
- How should attention checks interact with back navigation? Can a participant "retry"
  after going back?
