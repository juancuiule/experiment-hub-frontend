import { parsePlan } from "./lib/types";
import { buildWorkerPrompt } from "./lib/prompt";
import * as fs from "fs";

const plan = parsePlan(JSON.parse(fs.readFileSync(".claude-task/plan.json", "utf-8")));

for (const subtask of plan.subtasks) {
  const path = `.claude-task/${subtask.id}.md`;
  fs.writeFileSync(path, buildWorkerPrompt(subtask));
  console.log("Written:", path);
}
