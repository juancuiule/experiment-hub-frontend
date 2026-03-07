import { describe, expect, it } from "vitest";
import { evaluateCondition, getValue } from "../conditions";

// ---------------------------------------------------------------------------
// getValue
// ---------------------------------------------------------------------------

describe("getValue", async () => {
  it("resolves a top-level key", async () => {
    const ctx = { data: { profile: { age: 30 } } };
    expect(getValue(ctx, "$$profile")).toEqual({ age: 30 });
  });

  it("resolves a nested key via dot notation", async () => {
    const ctx = { data: { profile: { age: 30 } } };
    expect(getValue(ctx, "$$profile.age")).toBe(30);
  });

  it("returns undefined for a missing key", async () => {
    const ctx = { data: {} };
    expect(getValue(ctx, "$$missing.field")).toBeUndefined();
  });

  it("returns undefined when context.data is absent", async () => {
    expect(getValue({}, "$$profile.age")).toBeUndefined();
  });

  it("throws when the key does not start with $$ or @", async () => {
    expect(() => getValue({}, "profile.age" as any)).toThrow("Invalid key");
  });

  it("resolves fields from currentItem using @ prefix", async () => {
    const ctx = { currentItem: { value: "football", index: 0, loopId: "loop-sports" } };
    expect(getValue(ctx, "@value")).toBe("football");
    expect(getValue(ctx, "@index")).toBe(0);
    expect(getValue(ctx, "@loopId")).toBe("loop-sports");
  });

  it("returns undefined when currentItem is absent and @ prefix is used", async () => {
    expect(getValue({}, "@value")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// evaluateCondition
// ---------------------------------------------------------------------------

describe("evaluateCondition", async () => {
  const ctx = {
    data: {
      profile: { age: 25, name: "alice" },
      tags: { list: ["sport", "music"] },
      counts: { items: 3 },
    },
  };

  it("eq — matches equal value", async () => {
    expect(
      evaluateCondition(
        { operator: "eq", dataKey: "$$profile.name", value: "alice" },
        ctx,
      ),
    ).toBe(true);
  });

  it("eq — does not match different value", async () => {
    expect(
      evaluateCondition(
        { operator: "eq", dataKey: "$$profile.name", value: "bob" },
        ctx,
      ),
    ).toBe(false);
  });

  it("neq — matches when values differ", async () => {
    expect(
      evaluateCondition(
        { operator: "neq", dataKey: "$$profile.name", value: "bob" },
        ctx,
      ),
    ).toBe(true);
  });

  it("lt / lte / gt / gte numeric comparisons", async () => {
    const num = (op: any, v: number) =>
      evaluateCondition(
        { operator: op, dataKey: "$$profile.age", value: v },
        ctx,
      );
    expect(num("lt", 30)).toBe(true);
    expect(num("lt", 25)).toBe(false);
    expect(num("lte", 25)).toBe(true);
    expect(num("gt", 20)).toBe(true);
    expect(num("gt", 25)).toBe(false);
    expect(num("gte", 25)).toBe(true);
  });

  it("returns false when value is undefined for a base operator", async () => {
    expect(
      evaluateCondition(
        { operator: "eq", dataKey: "$$profile.missing", value: "x" },
        ctx,
      ),
    ).toBe(false);
  });

  it("contains — true when array includes the value", async () => {
    expect(
      evaluateCondition(
        { operator: "contains", dataKey: "$$tags.list", value: "sport" },
        ctx,
      ),
    ).toBe(true);
  });

  it("contains — false when array does not include the value", async () => {
    expect(
      evaluateCondition(
        { operator: "contains", dataKey: "$$tags.list", value: "cooking" },
        ctx,
      ),
    ).toBe(false);
  });

  it("contains — false when value is not an array", async () => {
    expect(
      evaluateCondition(
        { operator: "contains", dataKey: "$$profile.age", value: 25 },
        ctx,
      ),
    ).toBe(false);
  });

  it("length-gt — true when array length exceeds threshold", async () => {
    expect(
      evaluateCondition(
        { operator: "length-gt", dataKey: "$$tags.list", value: 1 },
        ctx,
      ),
    ).toBe(true);
  });

  it("length-lte — true when string length is within threshold", async () => {
    expect(
      evaluateCondition(
        { operator: "length-lte", dataKey: "$$profile.name", value: 5 },
        ctx,
      ),
    ).toBe(true); // "alice".length === 5
  });
});
