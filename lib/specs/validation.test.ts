import { describe, expect, it } from "vitest";
import { buildSchema } from "../validation";
import { ScreenComponent } from "../screen";

function schema(components: ScreenComponent[]) {
  return buildSchema(components);
}

describe("buildSchema", () => {
  describe("text-input", () => {
    it("passes when required input has a value", () => {
      const result = schema([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
      ]).safeParse({ name: "Juan" });
      expect(result.success).toBe(true);
    });

    it("fails when required input is empty", () => {
      const result = schema([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
      ]).safeParse({ name: "" });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("This field is required");
    });

    it("passes when optional input is empty", () => {
      const result = schema([
        { componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "Note" } },
      ]).safeParse({ note: "" });
      expect(result.success).toBe(true);
    });
  });

  describe("multiple-check", () => {
    it("passes when required multiple-check has selections", () => {
      const result = schema([
        { componentFamily: "response", template: "multiple-check", props: { dataKey: "tags", label: "Tags", required: true, options: [] } },
      ]).safeParse({ tags: ["a"] });
      expect(result.success).toBe(true);
    });

    it("fails when required multiple-check is empty", () => {
      const result = schema([
        { componentFamily: "response", template: "multiple-check", props: { dataKey: "tags", label: "Tags", required: true, options: [] } },
      ]).safeParse({ tags: [] });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Please select at least one option");
    });

    it("passes when optional multiple-check has no selections", () => {
      const result = schema([
        { componentFamily: "response", template: "multiple-check", props: { dataKey: "tags", label: "Tags", options: [] } },
      ]).safeParse({ tags: [] });
      expect(result.success).toBe(true);
    });
  });

  describe("rating", () => {
    it("passes when required rating has a value", () => {
      const result = schema([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Score", max: 5, required: true } },
      ]).safeParse({ score: "3" });
      expect(result.success).toBe(true);
    });

    it("fails when required rating is null (nothing selected)", () => {
      const result = schema([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Score", max: 5, required: true } },
      ]).safeParse({ score: null });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Please select a rating");
    });

    it("passes when optional rating is null", () => {
      const result = schema([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Score", max: 5 } },
      ]).safeParse({ score: null });
      expect(result.success).toBe(true);
    });
  });

  describe("non-data components", () => {
    it("ignores button components", () => {
      const result = schema([
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ]).safeParse({});
      expect(result.success).toBe(true);
    });

    it("ignores rich-text components", () => {
      const result = schema([
        { componentFamily: "content", template: "rich-text", props: { content: "## Hello" } },
      ]).safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("mixed required and optional fields", () => {
    it("fails only for the required field when optional is empty", () => {
      const result = schema([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
        { componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "Note" } },
      ]).safeParse({ name: "", note: "" });
      expect(result.success).toBe(false);
      expect(result.error?.issues).toHaveLength(1);
      expect(result.error?.issues[0].path[0]).toBe("name");
    });

    it("passes when all required fields have values and optional fields are empty", () => {
      const result = schema([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
        { componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "Note" } },
      ]).safeParse({ name: "Juan", note: "" });
      expect(result.success).toBe(true);
    });
  });
});
