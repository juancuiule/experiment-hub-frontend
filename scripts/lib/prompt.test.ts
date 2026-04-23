import { describe, it, expect } from "vitest";
import { buildWorkerPrompt } from "./prompt";
import type { Subtask } from "./types";

const subtask: Subtask = {
  id: "fix-validation",
  description: "Fix the requiresInteraction refine in lib/validation.ts",
  files: ["lib/validation.ts", "lib/components/response.ts"],
  model: "haiku",
  branch: "fix/validation",
  dependsOn: [],
};

describe("buildWorkerPrompt", () => {
  it("includes the branch setup command", () => {
    const prompt = buildWorkerPrompt(subtask);
    expect(prompt).toContain("fix/validation");
    expect(prompt).toContain("git checkout");
  });

  it("lists all files to read", () => {
    const prompt = buildWorkerPrompt(subtask);
    expect(prompt).toContain("lib/validation.ts");
    expect(prompt).toContain("lib/components/response.ts");
  });

  it("includes the task description", () => {
    const prompt = buildWorkerPrompt(subtask);
    expect(prompt).toContain("Fix the requiresInteraction refine");
  });

  it("tells the worker to run tests before committing", () => {
    const prompt = buildWorkerPrompt(subtask);
    expect(prompt).toContain("pnpm test");
  });
});
