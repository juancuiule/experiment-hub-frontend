# Proposal: Recruitment Quotas

## Inspiration
Gorilla SC, Qualtrics, and most panel platforms support quotas: once N participants
complete a condition, new arrivals are routed elsewhere or screened out. This is
essential for balanced experimental designs and for multi-cell A/B experiments where
cells need equal sample sizes.

## Problem

The fork node assigns arms by weight (random probability) but has no mechanism to stop
assigning to an arm once it has reached a target count. Over-recruitment is wasteful and
can skew analyses if the control arm happens to collect 300 responses and treatment only
200.

---

## Proposed Design

### 1. Add quota tracking to `ExperimentFlow`

```ts
// lib/types.ts

export type Quota = {
  /** Unique identifier for this quota. */
  id: string;
  /** Human-readable label. */
  name: string;
  /** Maximum number of completions before this quota is closed. */
  limit: number;
  /** Node IDs (typically fork arm paths or checkpoint IDs) that count toward this quota. */
  trackedNodeIds: string[];
  /** What to do when quota is full. */
  onFull: "end" | "redirect";
  redirectNodeId?: string;
};

export type ExperimentFlow = {
  // ...existing fields...
  quotas?: Quota[];
};
```

### 2. Quota state — server-side concern

Unlike other context fields, quota counts are global across all participants and cannot
live in a single participant's `context`. They must be tracked server-side. The flow
engine's role is to:

1. **Query** quota status at the moment of fork arm assignment.
2. **Increment** quota count when a participant reaches a tracked node.
3. **Re-route** when a quota is full.

This requires `send()` to be a real API call (see PROPOSAL-runtime-flow-validation.md).

### 3. Client-side integration point

The `traverseInNode` fork case gains a `checkQuota` hook:

```ts
// lib/flow.ts

export type FlowHooks = {
  checkQuota?: (quotaId: string) => Promise<{ full: boolean }>;
  incrementQuota?: (quotaId: string) => Promise<void>;
};
```

`startExperiment` accepts hooks:

```ts
export async function startExperiment(
  experiment: ExperimentFlow,
  startNodeId?: string,
  options?: { initialContext?: Context; hooks?: FlowHooks },
): Promise<FlowStep>
```

When the engine reaches a tracked node, it calls `hooks.incrementQuota(quotaId)`.
When selecting a fork arm, it calls `hooks.checkQuota` for each arm and excludes full
ones from the weighted selection.

### 4. Graceful degradation when hooks are absent

If `hooks.checkQuota` is not provided (e.g., in tests or local development), the engine
skips quota enforcement and proceeds with normal weighted selection. Quota logic is
additive and non-breaking.

### 5. Usage example

```ts
quotas: [
  {
    id: "control-quota",
    name: "Control arm (target n=50)",
    limit: 50,
    trackedNodeIds: ["path-control"],
    onFull: "redirect",
    redirectNodeId: "screen-full",
  },
  {
    id: "treatment-quota",
    name: "Treatment arm (target n=50)",
    limit: 50,
    trackedNodeIds: ["path-treatment"],
    onFull: "redirect",
    redirectNodeId: "screen-full",
  },
],
```

When both quotas are full, all new participants land on `screen-full`.

### 6. Soft vs hard quotas

- **Hard quota**: strictly enforced, arm unavailable once limit is hit.
- **Soft quota**: allows slight over-recruitment (e.g., up to 10% over limit) to
  account for partial completions. Add a `softLimit?: number` field.

### 7. Validator additions

- `quota-redirect-missing` — `onFull: "redirect"` but no `redirectNodeId`
- `quota-tracked-node-unknown` — a `trackedNodeId` doesn't exist in `nodes[]`

---

## Affected Files

| File | Change |
|------|--------|
| `lib/types.ts` | `Quota`, `FlowHooks`, extend `ExperimentFlow` |
| `lib/flow.ts` | Accept `hooks` in `startExperiment`; call `checkQuota` / `incrementQuota` |
| `lib/validate.ts` | Two new validation codes |
| `lib/specs/flow/flow.quotas.test.ts` | New test suite (mock hooks) |

---

## Open Questions

- Should quota state be polled (checked on every fork entry) or pushed (webhook from
  backend when a quota fills)? Polling is simpler; push avoids over-recruitment in
  high-traffic bursts.
- Should quotas apply to non-fork nodes (e.g., cap the total number of participants who
  complete the entire flow, not just individual arms)?
- How should the UI handle the moment a quota fills mid-session — abort gracefully or
  let the current participant finish?
