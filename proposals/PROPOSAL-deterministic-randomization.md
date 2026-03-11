# Proposal: Deterministic Randomization (Seeded RNG)

## Problem

Fork arm selection and option shuffling both use `Math.random()`. This has two
consequences:

1. **Tests must mock `Math.random`** to get predictable results, coupling test code to
   implementation details of the random algorithm.
2. **Reproducibility is impossible**: researchers cannot replay a specific participant's
   exact experience (same fork arm, same option order) without the original randomness
   outcome being persisted.

---

## Proposed Design

### 1. Add a PRNG to `lib/utils.ts`

```ts
// lib/utils.ts

/** Mulberry32 — fast, seedable, good distribution for our use cases. */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
```

### 2. Add `seed` to `Context`

```ts
// lib/types.ts

export type Context = Partial<{
  // ... existing fields ...
  seed: number;   // ← RNG seed for this session
}>;
```

### 3. Initialize the seed in `startExperiment`

```ts
// lib/flow.ts

export async function startExperiment(
  experiment: ExperimentFlow,
  startNodeId?: string,
  seed?: number,              // ← optional override for reproducibility
): Promise<FlowStep> {
  const resolvedSeed = seed ?? randomSeed();
  const context: Context = { seed: resolvedSeed };
  return await traverse(
    { state: { type: "initial" }, experiment, context },
    startNodeId ? { startNodeId } : undefined,
  );
}
```

### 4. Replace `Math.random()` calls with the seeded PRNG

All random calls in `flow.ts` derive from the context seed:

```ts
// In selectForkByWeight (flow.ts):
function selectForkByWeight(forks: Fork[], seed: number, callCount: number): Fork {
  const rand = mulberry32(seed + callCount)();
  // ... same logic ...
}
```

To avoid re-seeding the same value, the `callCount` acts as an offset. Alternatively,
carry a single PRNG instance through the FlowStep:

```ts
// lib/types.ts
export type FlowStep = {
  // ...
  rng: () => number;   // mutable PRNG instance
};
```

The mutable-function approach is simpler to thread through `traverse` but makes
`FlowStep` non-serializable. The `seed + callCount` approach keeps `FlowStep` as pure
data at the cost of a counter field.

### 5. Record the seed in context for analysis

The seed is already in `context.seed`. It is sent to the backend via `send(context)` at
each checkpoint, so researchers can reproduce any participant's session:

```ts
await send(context);   // context.seed is included
```

To replay: `startExperiment(experiment, startNodeId, recordedSeed)`.

### 6. Remove `Math.random` mocks from tests

Tests that currently use `vi.spyOn(Math, "random")` can instead pass a fixed seed:

```ts
const step = await startExperiment(flow, "start", /* seed */ 42);
```

The fork selection outcome is now deterministic from the seed, no mocking needed.

---

## Affected Files

| File | Change |
|------|--------|
| `lib/utils.ts` | Add `mulberry32`, `randomSeed` |
| `lib/types.ts` | Add `seed` to `Context`; optionally `rng` to `FlowStep` |
| `lib/flow.ts` | Thread seed/PRNG through `startExperiment`, `selectForkByWeight` |
| `lib/specs/flow/*.test.ts` | Replace `vi.spyOn(Math, "random")` with seed argument |
| `src/components/response/*.tsx` | Use seeded shuffle for `randomize` (see PROPOSAL-randomize-options.md) |

---

## Open Questions

- Should the PRNG instance be part of `FlowStep` (convenient but non-serializable) or
  reconstructed from `seed + callCount` (serializable but requires a counter)?
- Should `startExperiment` accept a full PRNG function instead of a seed, for callers
  that want to plug in their own RNG (e.g., a cryptographic one)?
- Should the seed be exposed to participants (e.g., in the URL for easy sharing of exact
  conditions)?
