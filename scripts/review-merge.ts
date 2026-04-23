import * as fs from "fs";
import { callOpus } from "./lib/anthropic";
import { getBranchDiff, branchExists } from "./lib/git";
import { parsePlan } from "./lib/types";

const REVIEWER_SYSTEM = `You are a code review agent helping merge parallel development branches into main.

Your job:
1. Determine a safe merge order (respecting declared dependencies, minimizing conflicts)
2. Flag any files modified by multiple branches (potential conflicts)
3. Write a one-line summary of what each branch changes

Format your response as:
## Merge Order
1. branch-name — reason
2. branch-name — reason
...

## Potential Conflicts
- file.ts — modified by branch-a and branch-b

## Branch Summaries
- branch-name: one-line description of changes

If there are no conflicts, write "None" under Potential Conflicts.`;

async function main() {
  const planPath = ".claude-task/plan.json";
  if (!fs.existsSync(planPath)) {
    console.error("No plan found. Run: pnpm plan \"<task>\" first.");
    process.exit(1);
  }

  const plan = parsePlan(JSON.parse(fs.readFileSync(planPath, "utf-8")));

  const diffs = plan.subtasks
    .map((s) => {
      if (!branchExists(s.branch)) {
        return `### ${s.branch}\n(branch not found — worker may not have committed yet)`;
      }
      const diff = getBranchDiff(s.branch);
      return `### ${s.branch}\n${diff || "(no changes)"}`;
    })
    .join("\n\n");

  const dependencyList = plan.subtasks
    .map((s) => `- ${s.branch} (dependsOn: ${s.dependsOn.join(", ") || "nothing"})`)
    .join("\n");

  const userMessage = `Task: ${plan.task}

Branches and their declared dependencies:
${dependencyList}

Diffs:
${diffs}`;

  console.log("Calling Opus for merge review...\n");
  const result = await callOpus(REVIEWER_SYSTEM, userMessage);

  console.log("=".repeat(60));
  console.log("MERGE REVIEW");
  console.log("=".repeat(60));
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
