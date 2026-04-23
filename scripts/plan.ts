import * as fs from "fs";
import { callClaude } from "./lib/claude-cli";
// import { callOpus } from "./lib/anthropic"; // Switch to this when using API key directly
import { getProjectFileTree } from "./lib/git";
import { parsePlan } from "./lib/types";
import { buildWorkerPrompt } from "./lib/prompt";

const PLANNER_SYSTEM = `You are a software planning agent for a TypeScript/Next.js project called Experiment Runner — an adaptive experiment runner for behavioral research.

Project structure:
- lib/ — Pure flow engine: state machine (flow.ts), types (types.ts), conditions, validation, resolve
- src/ — Next.js UI: Experiment.tsx, Screen.tsx, components/ (content, response, layout, control), data/ (store, experiment)
- app/ — Next.js App Router (page.tsx, layout.tsx)
- specs/ — Draft feature specs (session-persistence, back-navigation, answer-piping, score-variables)

Your job: given a task description and file tree, produce a JSON implementation plan.

Output ONLY valid JSON — no markdown fences, no explanation. Schema:
{
  "task": "string",
  "subtasks": [
    {
      "id": "kebab-case-slug",
      "description": "precise task for a Claude Code agent — include what to change, where exactly, and why",
      "files": ["array of file paths the worker must read"],
      "model": "haiku" or "sonnet",
      "branch": "fix/slug or feat/slug",
      "dependsOn": ["ids of subtasks that must complete first"]
    }
  ]
}

Model selection rules:
- "haiku": single-file edits, removing debug artifacts, simple fixes
- "sonnet": multi-file refactors, new feature implementations

Subtask description rules:
- Must be self-contained — the worker only sees this description and the listed files
- Include: what to change, the exact location (file + function/line if known), and why the change is needed
- Do not reference other subtasks by name — workers run independently`;

async function main() {
  const taskDescription = process.argv.slice(2).join(" ");
  if (!taskDescription) {
    console.error("Usage: pnpm plan \"<task description>\"");
    process.exit(1);
  }

  console.log("Planning task:", taskDescription);
  console.log("Calling Claude...\n");

  const fileTree = getProjectFileTree();
  const userMessage = `Task: ${taskDescription}\n\nProject file tree:\n${fileTree}`;

  const raw = callClaude(PLANNER_SYSTEM, userMessage);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("Opus returned invalid JSON:\n", raw);
    process.exit(1);
  }

  const plan = parsePlan(parsed);

  fs.mkdirSync(".claude-task", { recursive: true });
  fs.writeFileSync(".claude-task/plan.json", JSON.stringify(plan, null, 2));
  console.log(`Plan written to .claude-task/plan.json`);
  console.log(`Subtasks (${plan.subtasks.length}):`);

  for (const subtask of plan.subtasks) {
    const promptPath = `.claude-task/${subtask.id}.md`;
    fs.writeFileSync(promptPath, buildWorkerPrompt(subtask));
    console.log(`  [${subtask.model}] ${subtask.id} → ${subtask.branch}`);
  }

  console.log("\nReady. Run: pnpm launch");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
