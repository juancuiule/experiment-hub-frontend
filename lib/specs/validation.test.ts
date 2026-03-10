import { describe, expect, it } from "vitest";
import { buildSchema } from "@/lib/validation";
import { FrameworkScreen } from "@/lib/screen";

function screen(components: FrameworkScreen["components"]): FrameworkScreen {
  return { slug: "test", components };
}

// ---------------------------------------------------------------------------
// text-input
// ---------------------------------------------------------------------------

describe("text-input", () => {
  it("passes a non-empty string when required", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
      ])
    );
    expect(schema.safeParse({ name: "Alice" }).success).toBe(true);
  });

  it("fails an empty string when required", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
      ])
    );
    expect(schema.safeParse({ name: "" }).success).toBe(false);
  });

  it("passes an empty string when not required", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name" } },
      ])
    );
    expect(schema.safeParse({ name: "" }).success).toBe(true);
  });

  it("uses custom errorMessage", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "text-input",
          props: { dataKey: "name", label: "Name", required: true, errorMessage: "Please enter your name" },
        },
      ])
    );
    const result = schema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toContain("Please enter your name");
    }
  });
});

// ---------------------------------------------------------------------------
// dropdown / radio
// ---------------------------------------------------------------------------

describe("dropdown", () => {
  it("passes a selected option when required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "dropdown",
          props: { dataKey: "color", label: "Color", options: [{ label: "Red", value: "red" }], required: true },
        },
      ])
    );
    expect(schema.safeParse({ color: "red" }).success).toBe(true);
  });

  it("fails an empty string when required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "dropdown",
          props: { dataKey: "color", label: "Color", options: [], required: true },
        },
      ])
    );
    expect(schema.safeParse({ color: "" }).success).toBe(false);
  });
});

describe("radio", () => {
  it("passes when optional and empty", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "radio",
          props: { dataKey: "choice", label: "Pick", options: [] },
        },
      ])
    );
    expect(schema.safeParse({ choice: "" }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkboxes
// ---------------------------------------------------------------------------

describe("checkboxes", () => {
  it("passes when at least one selected and required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "checkboxes",
          props: { dataKey: "hobbies", label: "Hobbies", options: [], required: true },
        },
      ])
    );
    expect(schema.safeParse({ hobbies: ["reading"] }).success).toBe(true);
  });

  it("fails an empty array when required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "checkboxes",
          props: { dataKey: "hobbies", label: "Hobbies", options: [], required: true },
        },
      ])
    );
    expect(schema.safeParse({ hobbies: [] }).success).toBe(false);
  });

  it("enforces min selection count", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "checkboxes",
          props: { dataKey: "hobbies", label: "Hobbies", options: [], min: 2 },
        },
      ])
    );
    expect(schema.safeParse({ hobbies: ["a"] }).success).toBe(false);
    expect(schema.safeParse({ hobbies: ["a", "b"] }).success).toBe(true);
  });

  it("enforces max selection count", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "checkboxes",
          props: { dataKey: "hobbies", label: "Hobbies", options: [], max: 2 },
        },
      ])
    );
    expect(schema.safeParse({ hobbies: ["a", "b", "c"] }).success).toBe(false);
    expect(schema.safeParse({ hobbies: ["a", "b"] }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rating
// ---------------------------------------------------------------------------

describe("rating", () => {
  it("passes a value within range", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Rate", max: 5, required: true } },
      ])
    );
    expect(schema.safeParse({ score: 3 }).success).toBe(true);
  });

  it("fails zero (below min of 1)", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Rate", max: 5, required: true } },
      ])
    );
    expect(schema.safeParse({ score: 0 }).success).toBe(false);
  });

  it("fails above max", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Rate", max: 5, required: true } },
      ])
    );
    expect(schema.safeParse({ score: 6 }).success).toBe(false);
  });

  it("coerces string to number", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Rate", max: 5, required: true } },
      ])
    );
    expect(schema.safeParse({ score: "4" }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// slider
// ---------------------------------------------------------------------------

describe("slider", () => {
  it("passes a value within range", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "slider", props: { dataKey: "vol", label: "Volume", min: 0, max: 100 } },
      ])
    );
    expect(schema.safeParse({ vol: 50 }).success).toBe(true);
  });

  it("fails a value above max", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "slider", props: { dataKey: "vol", label: "Volume", min: 0, max: 100 } },
      ])
    );
    expect(schema.safeParse({ vol: 101 }).success).toBe(false);
  });

  it("coerces string to number", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "slider", props: { dataKey: "vol", label: "Volume", min: 0, max: 100 } },
      ])
    );
    expect(schema.safeParse({ vol: "75" }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// single-checkbox
// ---------------------------------------------------------------------------

describe("single-checkbox", () => {
  it("passes true when required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "single-checkbox",
          props: { dataKey: "agree", label: "Agree", defaultValue: false, required: true },
        },
      ])
    );
    expect(schema.safeParse({ agree: true }).success).toBe(true);
  });

  it("fails false when required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "single-checkbox",
          props: { dataKey: "agree", label: "Agree", defaultValue: false, required: true },
        },
      ])
    );
    expect(schema.safeParse({ agree: false }).success).toBe(false);
  });

  it("passes false when not required", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "single-checkbox",
          props: { dataKey: "agree", label: "Agree", defaultValue: false },
        },
      ])
    );
    expect(schema.safeParse({ agree: false }).success).toBe(true);
  });

  it("enforces shouldBe constraint", () => {
    const schema = buildSchema(
      screen([
        {
          componentFamily: "response",
          template: "single-checkbox",
          props: { dataKey: "tos", label: "Accept", defaultValue: false, shouldBe: true },
        },
      ])
    );
    expect(schema.safeParse({ tos: false }).success).toBe(false);
    expect(schema.safeParse({ tos: true }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// multi-field screen
// ---------------------------------------------------------------------------

describe("multi-field screen", () => {
  it("validates all fields together", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Rate", max: 5, required: true } },
        { componentFamily: "layout", template: "button", props: { text: "Next" } },
      ])
    );
    expect(schema.safeParse({ name: "Alice", score: 4 }).success).toBe(true);
    expect(schema.safeParse({ name: "", score: 4 }).success).toBe(false);
  });

  it("ignores non-response components", () => {
    const schema = buildSchema(
      screen([
        { componentFamily: "content", template: "rich-text", props: { content: "## Hello" } },
        { componentFamily: "layout", template: "button", props: { text: "Go" } },
      ])
    );
    // No fields — any object passes
    expect(schema.safeParse({}).success).toBe(true);
  });
});
