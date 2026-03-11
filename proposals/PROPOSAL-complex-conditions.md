# Proposal: Complex Boolean Conditions

## Problem

`ConditionConfig` supports a single `{ operator, dataKey, value }` triple. Any logic
requiring more than one check — "adult AND consented" or "age < 18 OR parental-consent = true" — cannot be expressed today. Branch nodes and the `Conditional` screen component are equally limited.

---

## Proposed Design

### 1. Extend `ConditionConfig` to a union

```ts
// lib/conditions.ts

export type SimpleCondition = {
  type: "simple";
  operator: Operator;
  dataKey: `$$${string}` | `@${string}` | `$${string}` | `#${string}`;
  value: string | number | boolean;
};

export type CompoundCondition =
  | { type: "and"; conditions: Condition[] }
  | { type: "or"; conditions: Condition[] }
  | { type: "not"; condition: Condition };

export type Condition = SimpleCondition | CompoundCondition;
```

`SimpleCondition` is the current shape, renamed and tagged. `CompoundCondition`
allows unlimited nesting.

### 2. Update `evaluateCondition`

```ts
export function evaluateCondition(cond: Condition, context: Context): boolean {
  if (cond.type === "simple") {
    return evaluateSimple(cond, context);
  }
  if (cond.type === "and") {
    return cond.conditions.every((c) => evaluateCondition(c, context));
  }
  if (cond.type === "or") {
    return cond.conditions.some((c) => evaluateCondition(c, context));
  }
  if (cond.type === "not") {
    return !evaluateCondition(cond.condition, context);
  }
  return false;
}
```

Short-circuits naturally: `and` stops at the first `false`, `or` stops at the
first `true`.

### 3. Backwards compatibility

Existing branch and loop configs use the bare `ConditionConfig` shape without a `type`
field. Add a migration shim:

```ts
export function normalizeCondition(
  raw: Condition | LegacyConditionConfig,
): Condition {
  if (
    "type" in raw &&
    (raw.type === "and" ||
      raw.type === "or" ||
      raw.type === "not" ||
      raw.type === "simple")
  ) {
    return raw as Condition;
  }
  // Legacy bare object — treat as simple
  return { type: "simple", ...(raw as LegacyConditionConfig) };
}
```

Call `normalizeCondition` at the top of `evaluateCondition` and at validation time.

### 4. Validator additions

- `condition-empty-and` / `condition-empty-or` — compound with zero children
- `condition-not-multiple` — `not` with more than one child (invalid)
- Recursively validate nested conditions

---

## Usage Example (branch config)

```ts
{
  id: "eligible",
  name: "Eligible participant",
  config: {
    type: "and",
    conditions: [
      { type: "simple", operator: "gte", dataKey: "$$profile.age", value: 18 },
      { type: "simple", operator: "eq",  dataKey: "$$consent.agreed", value: true },
    ],
  },
}
```

---

## Affected Files

| File                           | Change                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| `lib/conditions.ts`            | New types, updated `evaluateCondition`, `normalizeCondition` |
| `lib/components/control.ts`    | `ConditionalComponent.props.if` → `Condition`                |
| `lib/nodes.ts`                 | Branch config type → `Condition`                             |
| `lib/validate.ts`              | Recursive condition validator                                |
| `lib/specs/conditions.test.ts` | New compound condition test suite                            |

---

## Open Questions

- Should `not` support an array of conditions (implying `nand`) or strictly one?
- Do we want a `xor` operator for mutual exclusion checks in branch sets?
- Should the Conditional screen component expose compound logic in the UI builder?
