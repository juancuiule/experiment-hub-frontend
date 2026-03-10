import { describe, expect, it } from "vitest";
import { ExperimentFlow } from "../types";
import { validateExperiment } from "../validate";
import { makeScreen, seq } from "./test-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const start = { id: "start", type: "start" as const };

function codes(flow: ExperimentFlow) {
  return validateExperiment(flow).map((e) => e.code);
}

function messages(flow: ExperimentFlow) {
  return validateExperiment(flow).map((e) => e.message);
}

// ---------------------------------------------------------------------------
// Basic structural checks
// ---------------------------------------------------------------------------

describe("basic checks", () => {
  it("passes a valid minimal flow", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "slug-a")],
      edges: [seq("start", "s1")],
      screens: [
        {
          slug: "slug-a",
          components: [{ componentFamily: "layout", template: "button", props: { text: "Go" } }],
        },
      ],
    };
    expect(validateExperiment(flow)).toEqual([]);
  });

  it("reports missing start node", () => {
    const flow: ExperimentFlow = {
      nodes: [makeScreen("s1", "slug")],
      edges: [],
      screens: [],
    };
    expect(codes(flow)).toContain("missing-start");
  });

  it("reports multiple start nodes", () => {
    const flow: ExperimentFlow = {
      nodes: [start, { ...start, id: "start2" }],
      edges: [],
    };
    expect(codes(flow)).toContain("multiple-start");
  });

  it("reports duplicate node ids", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "a"), makeScreen("s1", "b")],
      edges: [],
    };
    expect(codes(flow)).toContain("duplicate-node-id");
  });

  it("reports edge referencing unknown node", () => {
    const flow: ExperimentFlow = {
      nodes: [start],
      edges: [seq("start", "ghost")],
    };
    expect(codes(flow)).toContain("unknown-node");
  });

  it("reports screen node with no matching screen definition", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "missing-slug")],
      edges: [seq("start", "s1")],
      screens: [],
    };
    expect(codes(flow)).toContain("missing-screen");
  });
});

// ---------------------------------------------------------------------------
// @ reference checks
// ---------------------------------------------------------------------------

describe("@ reference checks", () => {
  it("accepts @value in a loop template screen", () => {
    const flow: ExperimentFlow = {
      nodes: [
        start,
        { id: "loop", type: "loop", props: { type: "static", values: ["a"] } },
        makeScreen("s-item", "item"),
      ],
      edges: [
        seq("start", "loop"),
        { type: "loop-template", from: "loop", to: "s-item" },
      ],
      screens: [
        {
          slug: "item",
          components: [
            { componentFamily: "response", template: "rating", props: { dataKey: "r", label: "Rate @value", max: 5 } },
          ],
        },
      ],
    };
    expect(validateExperiment(flow)).toEqual([]);
  });

  it("reports @value used outside a loop", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "welcome")],
      edges: [seq("start", "s1")],
      screens: [
        {
          slug: "welcome",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Hi @value" } },
          ],
        },
      ],
    };
    expect(codes(flow)).toContain("invalid-reference");
    expect(messages(flow)[0]).toMatch(/not inside a loop/);
  });

  it("reports @value in rich-text outside a loop", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "intro")],
      edges: [seq("start", "s1")],
      screens: [
        {
          slug: "intro",
          components: [
            { componentFamily: "content", template: "rich-text", props: { content: "## @value" } },
          ],
        },
      ],
    };
    expect(codes(flow)).toContain("invalid-reference");
  });
});

// ---------------------------------------------------------------------------
// $$ reference checks
// ---------------------------------------------------------------------------

describe("$$ reference checks", () => {
  it("accepts a $$ reference to a screen that ran before", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "welcome"), makeScreen("s2", "profile")],
      edges: [seq("start", "s1"), seq("s1", "s2")],
      screens: [
        {
          slug: "welcome",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name" } },
          ],
        },
        {
          slug: "profile",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "Hi $$welcome.name" } },
          ],
        },
      ],
    };
    expect(validateExperiment(flow)).toEqual([]);
  });

  it("reports a $$ reference to data that has not been written yet", () => {
    const flow: ExperimentFlow = {
      nodes: [start, makeScreen("s1", "welcome")],
      edges: [seq("start", "s1")],
      screens: [
        {
          slug: "welcome",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Hi $$other.name" } },
          ],
        },
      ],
    };
    expect(codes(flow)).toContain("unavailable-reference");
  });

  it("accepts a $$ reference to data written inside a path", () => {
    const flow: ExperimentFlow = {
      nodes: [
        start,
        { id: "path-info", type: "path", props: { name: "Info" } },
        makeScreen("s-age", "demographics"),
        makeScreen("s-after", "after"),
      ],
      edges: [
        seq("start", "path-info"),
        { type: "path-contains", from: "path-info", to: "s-age", order: 0 },
        seq("path-info", "s-after"),
      ],
      screens: [
        {
          slug: "demographics",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "age", label: "Age" } },
          ],
        },
        {
          slug: "after",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "$$path-info.demographics.age" } },
          ],
        },
      ],
    };
    expect(validateExperiment(flow)).toEqual([]);
  });

  it("reports a $$ reference to data from a parallel branch that isn't guaranteed", () => {
    const flow: ExperimentFlow = {
      nodes: [
        start,
        makeScreen("s-before", "before"),
        {
          id: "branch",
          type: "branch",
          props: {
            name: "B",
            branches: [
              {
                id: "yes",
                name: "Yes",
                config: {
                  operator: "eq",
                  dataKey: "$$before.answer",
                  value: "yes",
                },
              },
            ],
          },
        },
        makeScreen("s-yes", "branch-yes"),
        makeScreen("s-no", "branch-no"),
        makeScreen("s-after", "after"),
      ],
      edges: [
        seq("start", "s-before"),
        seq("s-before", "branch"),
        { type: "branch-condition", from: "branch.yes", to: "s-yes" },
        { type: "branch-default", from: "branch", to: "s-no" },
        seq("s-yes", "s-after"),
        seq("s-no", "s-after"),
      ],
      screens: [
        {
          slug: "before",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "answer", label: "Answer" } },
          ],
        },
        {
          slug: "branch-yes",
          components: [{ componentFamily: "layout", template: "button", props: { text: "Ok" } }],
        },
        {
          slug: "branch-no",
          components: [{ componentFamily: "layout", template: "button", props: { text: "Ok" } }],
        },
        {
          slug: "after",
          // References data written only in the "yes" branch — not guaranteed
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "x", label: "$$branch-yes.something" } },
          ],
        },
      ],
    };
    expect(codes(flow)).toContain("unavailable-reference");
  });

  it("does not report errors when referencing data from before a branch", () => {
    const flow: ExperimentFlow = {
      nodes: [
        start,
        makeScreen("s-before", "before"),
        {
          id: "branch",
          type: "branch",
          props: {
            name: "B",
            branches: [
              {
                id: "yes",
                name: "Yes",
                config: {
                  operator: "eq",
                  dataKey: "$$before.answer",
                  value: "yes",
                },
              },
            ],
          },
        },
        makeScreen("s-yes", "branch-yes"),
        makeScreen("s-no", "branch-no"),
        makeScreen("s-after", "after"),
      ],
      edges: [
        seq("start", "s-before"),
        seq("s-before", "branch"),
        { type: "branch-condition", from: "branch.yes", to: "s-yes" },
        { type: "branch-default", from: "branch", to: "s-no" },
        seq("s-yes", "s-after"),
        seq("s-no", "s-after"),
      ],
      screens: [
        {
          slug: "before",
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "answer", label: "Answer" } },
          ],
        },
        {
          slug: "branch-yes",
          components: [{ componentFamily: "layout", template: "button", props: { text: "Ok" } }],
        },
        {
          slug: "branch-no",
          components: [{ componentFamily: "layout", template: "button", props: { text: "Ok" } }],
        },
        {
          slug: "after",
          // References data written BEFORE the branch — always available
          components: [
            { componentFamily: "response", template: "text-input", props: { dataKey: "x", label: "$$before.answer" } },
          ],
        },
      ],
    };
    expect(validateExperiment(flow)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Validate the actual experiment
// ---------------------------------------------------------------------------

describe("actual experiment", () => {
  it("has no validation errors", async () => {
    const { experiment } = await import("@/src/data/experiment");
    expect(validateExperiment(experiment)).toEqual([]);
  });
});
