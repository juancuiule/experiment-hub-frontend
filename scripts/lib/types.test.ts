import { describe, it, expect } from "vitest";
import { parsePlan } from "./types";

describe("parsePlan", () => {
  it("accepts a valid plan", () => {
    const raw = {
      task: "Fix validation bugs",
      subtasks: [
        {
          id: "fix-validation",
          description: "Fix the requiresInteraction refine",
          files: ["lib/validation.ts"],
          model: "haiku",
          branch: "fix/validation",
          dependsOn: [],
        },
      ],
    };
    const plan = parsePlan(raw);
    expect(plan.subtasks).toHaveLength(1);
    expect(plan.subtasks[0].id).toBe("fix-validation");
  });

  it("throws on invalid model tier", () => {
    const raw = {
      task: "task",
      subtasks: [
        {
          id: "t",
          description: "d",
          files: [],
          model: "opus",
          branch: "fix/t",
          dependsOn: [],
        },
      ],
    };
    expect(() => parsePlan(raw)).toThrow();
  });

  it("throws when subtask is missing required field", () => {
    const raw = {
      task: "task",
      subtasks: [{ id: "t", model: "haiku" }],
    };
    expect(() => parsePlan(raw)).toThrow();
  });
});
