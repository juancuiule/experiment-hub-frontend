import { Context } from "./types";


export type BaseOperator = "lt" | "lte" | "gt" | "gte" | "eq" | "neq";

export type ArrayOperator = "contains" | `length-${BaseOperator}`;

export type Operator = BaseOperator | ArrayOperator;
export type ConditionConfig = {
  operator: Operator;
  dataKey: `$$${string}` | `@${string}` | `$${string}`;
  value: string | number | boolean;
};

function evaluateBaseOperator(op: BaseOperator, a: any, b: any): boolean {
  switch (op) {
    case "eq":
      return a == b;
    case "neq":
      return a != b;
    case "lt":
      return Number(a) < Number(b);
    case "lte":
      return Number(a) <= Number(b);
    case "gt":
      return Number(a) > Number(b);
    case "gte":
      return Number(a) >= Number(b);
  }
}

export function isBaseOperator(operator: Operator): operator is BaseOperator {
  return ["lt", "lte", "gt", "gte", "eq", "neq"].includes(operator);
}

export function getValue(context: Context, key: `$$${string}` | `@${string}` | `$${string}`) {
  if (key.startsWith("$$")) {
    return key
      .slice(2)
      .split(".")
      .reduce(
        (obj: any, k) => (obj == null ? undefined : obj[k]),
        context["data"],
      );
  }

  if (key.startsWith("@")) {
    return key
      .slice(1)
      .split(".")
      .reduce(
        (obj: any, k) => (obj == null ? undefined : obj[k]),
        context["currentItem"],
      );
  }

  if (key.startsWith("$")) {
    return key
      .slice(1)
      .split(".")
      .reduce(
        (obj: any, k) => (obj == null ? undefined : obj[k]),
        context["screenData"],
      );
  }

  throw new Error(`Invalid key: ${key}`);
}

export function evaluateCondition(
  config: ConditionConfig,
  context: Context,
): boolean {
  const key = config.dataKey;
  const value = getValue(context, key);

  if (config.operator === "contains") {
    return Array.isArray(value) && value.includes(config.value);
  }

  if (config.operator.startsWith("length-")) {
    const op = config.operator.slice("length-".length) as BaseOperator;
    const len = Array.isArray(value)
      ? value.length
      : String(value ?? "").length;
    return evaluateBaseOperator(op, len, Number(config.value));
  }

  if (isBaseOperator(config.operator)) {
    if (value === undefined) return false;
    return evaluateBaseOperator(config.operator, value, config.value);
  }

  return false;
}
