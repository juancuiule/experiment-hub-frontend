import { describe, expect, it } from "vitest";
import { resolveValuesInString } from "../resolve";

describe("resolveValuesInString", () => {
  describe("@value references", () => {
    it("replaces @value with currentItem.value", () => {
      const ctx = { currentItem: { value: "soccer", index: 0, loopId: "l" } };
      expect(resolveValuesInString("I like @value", ctx)).toBe("I like soccer");
    });

    it("replaces @index with currentItem.index", () => {
      const ctx = { currentItem: { value: "x", index: 2, loopId: "l" } };
      expect(resolveValuesInString("Item @index", ctx)).toBe("Item 2");
    });

    it("replaces @loopId with currentItem.loopId", () => {
      const ctx = { currentItem: { value: "x", index: 0, loopId: "loop-sports" } };
      expect(resolveValuesInString("Loop: @loopId", ctx)).toBe("Loop: loop-sports");
    });

    it("replaces @index when value is 0 (does not leave token)", () => {
      const ctx = { currentItem: { value: "x", index: 0, loopId: "l" } };
      expect(resolveValuesInString("Item @index", ctx)).toBe("Item 0");
    });

    it("leaves the token as-is when currentItem is undefined", () => {
      expect(resolveValuesInString("Hello @value", {})).toBe("Hello @value");
    });

    it("replaces multiple @value tokens in one string", () => {
      const ctx = { currentItem: { value: "chess", index: 0, loopId: "l" } };
      expect(resolveValuesInString("@value and @value", ctx)).toBe("chess and chess");
    });
  });

  describe("$$ references", () => {
    it("replaces $$key with the value from context.data", () => {
      const ctx = { data: { welcome: { name: "Juan" } } };
      expect(resolveValuesInString("Hi $$welcome.name!", ctx)).toBe("Hi Juan!");
    });

    it("resolves deeply nested paths", () => {
      const ctx = { data: { a: { b: { c: "deep" } } } };
      expect(resolveValuesInString("$$a.b.c", ctx)).toBe("deep");
    });

    it("leaves the token as-is when the path does not resolve", () => {
      const ctx = { data: { welcome: {} } };
      expect(resolveValuesInString("Hi $$welcome.name", ctx)).toBe("Hi $$welcome.name");
    });

    it("leaves the token as-is when context.data is undefined", () => {
      expect(resolveValuesInString("$$foo.bar", {})).toBe("$$foo.bar");
    });

    it("resolves multiple distinct $$ tokens in one string", () => {
      const ctx = { data: { a: { x: "foo" }, b: { y: "bar" } } };
      expect(resolveValuesInString("$$a.x and $$b.y", ctx)).toBe("foo and bar");
    });
  });

  describe("mixed references", () => {
    it("resolves both @value and $$ tokens in the same string", () => {
      const ctx = {
        data: { welcome: { name: "Juan" } },
        currentItem: { value: "soccer", index: 0, loopId: "l" },
      };
      expect(resolveValuesInString("$$welcome.name likes @value", ctx)).toBe("Juan likes soccer");
    });
  });

  describe("edge cases", () => {
    it("returns the string unchanged when there are no tokens", () => {
      expect(resolveValuesInString("No tokens here", {})).toBe("No tokens here");
    });

    it("converts non-string resolved values to string", () => {
      const ctx = { currentItem: { value: 42, index: 0, loopId: "l" } };
      expect(resolveValuesInString("Score: @value", ctx)).toBe("Score: 42");
    });
  });
});
