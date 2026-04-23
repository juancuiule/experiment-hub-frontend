export type ModelTier = "haiku" | "sonnet";

export type Subtask = {
  id: string;
  description: string;
  files: string[];
  model: ModelTier;
  branch: string;
  dependsOn: string[];
};

export type Plan = {
  task: string;
  subtasks: Subtask[];
};

export function parsePlan(raw: unknown): Plan {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Plan must be an object");
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.task !== "string") throw new Error("Plan.task must be a string");
  if (!Array.isArray(obj.subtasks)) throw new Error("Plan.subtasks must be an array");

  const subtasks: Subtask[] = obj.subtasks.map((s: unknown, i: number) => {
    if (typeof s !== "object" || s === null) throw new Error(`subtask[${i}] must be an object`);
    const sub = s as Record<string, unknown>;

    if (typeof sub.id !== "string") throw new Error(`subtask[${i}].id must be a string`);
    if (typeof sub.description !== "string") throw new Error(`subtask[${i}].description must be a string`);
    if (!Array.isArray(sub.files)) throw new Error(`subtask[${i}].files must be an array`);
    if (sub.model !== "haiku" && sub.model !== "sonnet") {
      throw new Error(`subtask[${i}].model must be "haiku" or "sonnet", got "${sub.model}"`);
    }
    if (typeof sub.branch !== "string") throw new Error(`subtask[${i}].branch must be a string`);
    if (!Array.isArray(sub.dependsOn)) throw new Error(`subtask[${i}].dependsOn must be an array`);

    return {
      id: sub.id,
      description: sub.description,
      files: sub.files as string[],
      model: sub.model,
      branch: sub.branch,
      dependsOn: sub.dependsOn as string[],
    };
  });

  return { task: obj.task, subtasks };
}
