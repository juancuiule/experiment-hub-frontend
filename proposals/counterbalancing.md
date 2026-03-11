# Proposal: Counterbalancing

## Inspiration
Gorilla SC's counterbalancing is its flagship feature for experimental design.
Qualtrics block randomization and Survey Solutions do similar things. Counterbalancing
ensures that across N participants, every possible ordering of conditions appears equally
often — eliminating order effects that random assignment alone cannot control.

## Problem

The current `fork` node assigns arms by random weight. For a 2-arm study with 100
participants you would expect ~50/50 but could easily get 60/40 by chance.
More importantly, no ordering control exists at all: if participants must see two
stimuli (A then B, or B then A), there is no mechanism to guarantee equal numbers of
each order across the sample.

---

## Proposed Design

### 1. `counterbalance` node type

```ts
// lib/nodes.ts

export interface CounterbalanceNode extends BaseNode<"counterbalance"> {
  props: {
    name: string;
    /** The design to apply. */
    design:
      | { type: "full-random"; arms: CbArm[] }          // like current fork but truly balanced
      | { type: "latin-square"; arms: CbArm[] }         // NxN cyclic rotation
      | { type: "abba"; arms: [CbArm, CbArm] }          // A B B A ordering for 2 arms
      | { type: "block-random"; arms: CbArm[]; blockSize: number }; // balanced within blocks of N
  };
}

export type CbArm = {
  id: string;
  name: string;
  /** Sequence of node IDs this arm should traverse (in order). */
  sequence: string[];
};
```

### 2. Assignment is server-coordinated

Like quotas, balanced assignment requires a global counter shared across participants.
The engine queries a backend endpoint that implements the assignment algorithm and
returns the next arm/sequence for this participant:

```ts
// lib/flow.ts — FlowHooks extension

export type FlowHooks = {
  // ...existing quota hooks...
  getCounterbalanceAssignment?: (
    nodeId: string,
    design: CounterbalanceNode["props"]["design"],
  ) => Promise<{ armId: string; sequence: string[] }>;
};
```

### 3. Latin square implementation (server-side reference)

For N arms, the Latin square cycles assignments:

```
Participant 1: A → B → C
Participant 2: B → C → A
Participant 3: C → A → B
Participant 4: A → B → C  (wraps)
```

The server maintains a counter `k` (participants assigned so far) and returns
`sequence = rotate(arms, k % N)`.

### 4. Local fallback (no server)

When `getCounterbalanceAssignment` is not provided, fall back to weighted random
(matching current fork behavior). This preserves tests and local development.

### 5. Recording the assignment

The assigned sequence is stored in `context.counterbalance[nodeId]`:

```ts
// lib/types.ts — extend Context
counterbalance?: {
  [nodeId: string]: { armId: string; sequence: string[] };
};
```

### 6. ABBA design — within-participant counterbalancing

For within-subject designs, a single participant must see all arms in an ABBA order.
This requires the `counterbalance` node to emit multiple sequential arcs:

```
counterbalance (ABBA) → arm-A → arm-B → arm-B → arm-A → continue
```

The engine unrolls the ABBA sequence as four path steps.

### 7. Usage example

```ts
{
  id: "cb-stimuli",
  type: "counterbalance",
  props: {
    name: "Stimulus order",
    design: {
      type: "latin-square",
      arms: [
        { id: "order-abc", name: "A then B then C", sequence: ["screen-a", "screen-b", "screen-c"] },
        { id: "order-bca", name: "B then C then A", sequence: ["screen-b", "screen-c", "screen-a"] },
        { id: "order-cab", name: "C then A then B", sequence: ["screen-c", "screen-a", "screen-b"] },
      ],
    },
  },
}
```

### 8. Validator additions

- `cb-arm-sequence-unknown-node` — a sequence entry references a node that doesn't exist
- `cb-latin-square-size` — latin-square requires at least 2 arms
- `cb-abba-wrong-arm-count` — ABBA design requires exactly 2 arms

---

## Affected Files

| File | Change |
|------|--------|
| `lib/nodes.ts` | Add `CounterbalanceNode`, `CbArm` |
| `lib/types.ts` | Extend `Context` with `counterbalance`; extend `FlowHooks` |
| `lib/flow.ts` | Handle `counterbalance` in `traverseInNode` |
| `lib/validate.ts` | Three new validation codes |
| `lib/specs/flow/flow.counterbalance.test.ts` | New test suite |

---

## Open Questions

- Should the ABBA unrolling happen at flow definition time (static expansion into
  path nodes) or at traversal time (dynamic state management)? Static expansion is
  simpler to reason about; dynamic is more compact.
- Should `counterbalance` subsume `fork` entirely, with `fork` becoming sugar for
  `type: "full-random"`?
- For Gorilla SC compatibility, should there be an import/export format for
  counterbalancing tables (CSV of participant ID → arm assignment)?
