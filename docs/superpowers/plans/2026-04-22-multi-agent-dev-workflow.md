# Multi-Agent Dev Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tmux-based multi-agent development workflow where Opus 4.7 plans a task, a shell script spawns parallel Claude Code workers in tmux panes, and Opus reviews the merge order when done.

**Architecture:** A TypeScript planner script calls Opus via the Anthropic API and writes a `plan.json` + per-worker task prompt files to `.claude-task/`. A bash launcher reads the plan, creates a tmux session with one pane per worker plus a status pane and a reviewer pane, and starts `claude --print` in each worker pane. A TypeScript reviewer script calls Opus with all worker branch diffs and prints a merge order.

**Tech Stack:** TypeScript, `tsx` (script runner), `@anthropic-ai/sdk`, Node.js `child_process`, tmux, Claude Code CLI (`claude`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scripts/lib/types.ts` | Create | Shared `Plan`, `Subtask` types |
| `scripts/lib/anthropic.ts` | Create | Anthropic client with prompt caching, `callOpus()` helper |
| `scripts/lib/git.ts` | Create | `getBranchDiff()`, `branchExists()` |
| `scripts/lib/prompt.ts` | Create | `buildWorkerPrompt()` — generates task `.md` file content |
| `scripts/plan.ts` | Create | CLI entry: reads task arg, calls Opus, writes plan + task prompts |
| `scripts/launch.sh` | Create | Reads plan, creates tmux session with worker panes |
| `scripts/review-merge.ts` | Create | CLI entry: reads plan, collects diffs, calls Opus, prints merge order |
| `scripts/lib/types.test.ts` | Create | Unit tests for plan JSON parsing |
| `scripts/lib/prompt.test.ts` | Create | Unit tests for worker prompt generation |
| `package.json` | Modify | Add `plan`, `launch`, `review-merge` scripts; add `@anthropic-ai/sdk`, `tsx` deps |
| `.gitignore` | Modify | Add `.claude-task/` |

---

## Task 1: Add dependencies and scripts

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install packages**

```bash
pnpm add @anthropic-ai/sdk
pnpm add -D tsx
```

- [ ] **Step 2: Add pnpm scripts to `package.json`**

In the `"scripts"` block, add:

```json
"plan": "tsx scripts/plan.ts",
"launch": "bash scripts/launch.sh",
"review-merge": "tsx scripts/review-merge.ts"
```

- [ ] **Step 3: Add `.claude-task/` to `.gitignore`**

Append to `.gitignore`:

```
# multi-agent workflow runtime files
.claude-task/
```

- [ ] **Step 4: Create the `scripts/` directory structure**

```bash
mkdir -p scripts/lib
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .gitignore
git commit -m "chore: add anthropic sdk, tsx, and workflow npm scripts"
```

---

## Task 2: Shared types (`scripts/lib/types.ts`)

**Files:**
- Create: `scripts/lib/types.ts`
- Create: `scripts/lib/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/types.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test scripts/lib/types.test.ts
```

Expected: FAIL — `parsePlan` is not defined.

- [ ] **Step 3: Create `scripts/lib/types.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test scripts/lib/types.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/types.ts scripts/lib/types.test.ts
git commit -m "feat(workflow): add Plan/Subtask types with parsePlan validator"
```

---

## Task 3: Anthropic client (`scripts/lib/anthropic.ts`)

**Files:**
- Create: `scripts/lib/anthropic.ts`

No unit test for this file — it's a thin wrapper over the SDK. Integration tested implicitly by the planner in Task 5.

- [ ] **Step 1: Create `scripts/lib/anthropic.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic();

export async function callOpus(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const stream = await client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const message = await stream.finalMessage();
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text block in Opus response");
  return block.text;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/anthropic.ts
git commit -m "feat(workflow): add Opus API client with prompt caching"
```

---

## Task 4: Git helpers (`scripts/lib/git.ts`)

**Files:**
- Create: `scripts/lib/git.ts`

- [ ] **Step 1: Create `scripts/lib/git.ts`**

```typescript
import { execSync } from "child_process";

export function getBranchDiff(branch: string, base = "main"): string {
  try {
    return execSync(`git diff ${base}...${branch}`, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

export function branchExists(branch: string): boolean {
  try {
    execSync(`git show-ref --verify --quiet refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

export function getProjectFileTree(): string {
  return execSync(
    'find lib src app scripts -type f -name "*.ts" -o -name "*.tsx" | sort | grep -v node_modules | grep -v .next',
    { encoding: "utf-8" }
  ).trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/git.ts
git commit -m "feat(workflow): add git helpers for branch diff and file tree"
```

---

## Task 5: Worker prompt builder (`scripts/lib/prompt.ts`)

**Files:**
- Create: `scripts/lib/prompt.ts`
- Create: `scripts/lib/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `scripts/lib/prompt.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test scripts/lib/prompt.test.ts
```

Expected: FAIL — `buildWorkerPrompt` is not defined.

- [ ] **Step 3: Create `scripts/lib/prompt.ts`**

```typescript
import type { Subtask } from "./types";

export function buildWorkerPrompt(subtask: Subtask): string {
  const fileList = subtask.files.map((f) => `- ${f}`).join("\n");

  return `## Task: ${subtask.id}

${subtask.description}

## Files to read first
${fileList}

## Git setup
Run this before making any changes:
\`\`\`bash
git checkout -b ${subtask.branch} main 2>/dev/null || git checkout ${subtask.branch}
\`\`\`

## Rules
- Only modify files listed above (and their test files if applicable)
- Do not modify any other files
- After making changes, run tests: \`pnpm test\`
- Commit all changes before finishing

## Commit message format
Use a conventional commit message, for example:
\`fix: requiresInteraction refine always returns true\`

## Done when
- Changes are committed to branch \`${subtask.branch}\`
- \`pnpm test\` passes
`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test scripts/lib/prompt.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/prompt.ts scripts/lib/prompt.test.ts
git commit -m "feat(workflow): add worker prompt builder"
```

---

## Task 6: Planner script (`scripts/plan.ts`)

**Files:**
- Create: `scripts/plan.ts`

- [ ] **Step 1: Create `scripts/plan.ts`**

```typescript
import * as fs from "fs";
import * as path from "path";
import { callOpus } from "./lib/anthropic";
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
  console.log("Calling Opus 4.7...\n");

  const fileTree = getProjectFileTree();
  const userMessage = `Task: ${taskDescription}\n\nProject file tree:\n${fileTree}`;

  const raw = await callOpus(PLANNER_SYSTEM, userMessage, 8192);

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
```

- [ ] **Step 2: Test manually with a real task**

```bash
export ANTHROPIC_API_KEY=<your key>
pnpm plan "Fix the requiresInteraction validation bug and remove all debug artifacts from the UI"
```

Expected output:
```
Planning task: Fix the requiresInteraction validation bug...
Calling Opus 4.7...

Plan written to .claude-task/plan.json
Subtasks (3):
  [haiku] fix-validation → fix/validation
  [haiku] remove-debug-resolve → fix/debug-resolve
  [haiku] remove-debug-ui → fix/debug-ui

Ready. Run: pnpm launch
```

Check `.claude-task/plan.json` exists and contains valid subtasks. Check `.claude-task/<id>.md` files exist with proper content.

- [ ] **Step 3: Commit**

```bash
git add scripts/plan.ts
git commit -m "feat(workflow): add Opus planner script"
```

---

## Task 7: tmux launcher (`scripts/launch.sh`)

**Files:**
- Create: `scripts/launch.sh`

- [ ] **Step 1: Create `scripts/launch.sh`**

```bash
#!/usr/bin/env bash
set -e

PLAN_FILE=".claude-task/plan.json"
SESSION="multi-agent"

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: No plan found at $PLAN_FILE"
  echo "Run: pnpm plan \"your task\""
  exit 1
fi

# Parse plan with node
SUBTASK_IDS=$(node -e "
  const p = JSON.parse(require('fs').readFileSync('$PLAN_FILE', 'utf-8'));
  console.log(p.subtasks.map(s => s.id).join('\n'));
")

SUBTASK_COUNT=$(node -e "
  const p = JSON.parse(require('fs').readFileSync('$PLAN_FILE', 'utf-8'));
  console.log(p.subtasks.length);
")

echo "Starting workflow: $SUBTASK_COUNT workers"

# Kill existing session
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create session — first pane is the status pane
tmux new-session -d -s "$SESSION" -x 220 -y 60

# Status pane (top): show plan summary
tmux rename-window -t "$SESSION:0" "workflow"
tmux send-keys -t "$SESSION:0" \
  "node -e \"const p=JSON.parse(require('fs').readFileSync('$PLAN_FILE','utf-8')); console.log('PLAN: '+p.task+'\n'); p.subtasks.forEach((s,i)=>console.log('  '+(i+1)+'. ['+s.model+'] '+s.id+' → '+s.branch))\"" \
  Enter

# Split status pane to make room for workers (workers take 75% of height)
tmux split-window -t "$SESSION:0" -v -p 75

# Worker panes: split the bottom area horizontally for each worker
FIRST_WORKER=true
PANE_IDX=1

for ID in $SUBTASK_IDS; do
  PROMPT_FILE=".claude-task/${ID}.md"
  if [ ! -f "$PROMPT_FILE" ]; then
    echo "Warning: prompt file not found: $PROMPT_FILE — skipping $ID"
    continue
  fi

  if [ "$FIRST_WORKER" = true ]; then
    FIRST_WORKER=false
    # First worker uses the bottom pane (index 1)
    tmux send-keys -t "$SESSION:0.$PANE_IDX" \
      "echo '=== WORKER: $ID ===' && claude --print \"\$(cat $PROMPT_FILE)\" && echo '✓ DONE: $ID'" \
      Enter
  else
    # Additional workers: split last worker pane horizontally
    tmux split-window -t "$SESSION:0.$PANE_IDX" -h
    PANE_IDX=$((PANE_IDX + 1))
    tmux send-keys -t "$SESSION:0.$PANE_IDX" \
      "echo '=== WORKER: $ID ===' && claude --print \"\$(cat $PROMPT_FILE)\" && echo '✓ DONE: $ID'" \
      Enter
  fi
done

# Reviewer pane: split off from status pane at the bottom
tmux split-window -t "$SESSION:0.0" -v -p 20
REVIEWER_PANE=$(tmux list-panes -t "$SESSION:0" -F "#{pane_index}" | tail -1)
tmux send-keys -t "$SESSION:0.$REVIEWER_PANE" \
  "echo 'Waiting for all workers... run: pnpm review-merge when workers are done'" \
  Enter

# Attach
tmux attach-session -t "$SESSION"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/launch.sh
```

- [ ] **Step 3: Test the layout (dry run — without real workers)**

Edit `scripts/launch.sh` temporarily: replace the `claude --print ...` command with `sleep 30 && echo "DONE: $ID"` to test the tmux layout without spending API credits. Run:

```bash
pnpm launch
```

Verify:
- Session named `multi-agent` appears
- Status pane at top shows plan summary
- Worker panes appear side-by-side in the middle
- Reviewer pane at bottom shows the "waiting" message
- `Ctrl+b` then arrow keys navigate between panes

Restore the real `claude --print` command after verifying the layout.

- [ ] **Step 4: Commit**

```bash
git add scripts/launch.sh
git commit -m "feat(workflow): add tmux launcher for parallel worker panes"
```

---

## Task 8: Merge reviewer (`scripts/review-merge.ts`)

**Files:**
- Create: `scripts/review-merge.ts`

- [ ] **Step 1: Create `scripts/review-merge.ts`**

```typescript
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
```

- [ ] **Step 2: Test manually after workers have committed**

After running a full workflow and workers have committed to their branches:

```bash
pnpm review-merge
```

Expected output: merge order, conflict list, branch summaries printed to the reviewer pane.

- [ ] **Step 3: Commit**

```bash
git add scripts/review-merge.ts
git commit -m "feat(workflow): add Opus merge reviewer script"
```

---

## Task 9: End-to-end smoke test

- [ ] **Step 1: Run all unit tests**

```bash
pnpm test
```

Expected: all existing tests plus the 7 new tests (types + prompt) pass.

- [ ] **Step 2: Run the full workflow on a real task**

```bash
export ANTHROPIC_API_KEY=<your key>
pnpm plan "Remove the debug console.log from lib/resolve.ts and the JSON debug panels from src/Experiment.tsx and src/Screen.tsx"
pnpm launch
```

In the worker panes: watch Claude Code read the files, make edits, run tests, and commit.

After workers finish:

```bash
pnpm review-merge
```

Review the output. Verify branches exist:

```bash
git branch
```

- [ ] **Step 3: Merge the branches**

Following the merge order from the reviewer:

```bash
git checkout main
git merge --no-ff fix/<branch-1>
git merge --no-ff fix/<branch-2>
# etc.
```

- [ ] **Step 4: Verify the app still works**

```bash
pnpm dev
```

Open `http://localhost:3000`. Confirm no debug JSON panels visible, no console.log spam in terminal.

---

## Usage Reference

```bash
# 1. Describe the task — Opus generates a plan
pnpm plan "Fix the requiresInteraction validation bug and reconcile the two interpolation implementations"

# 2. Launch the tmux session — workers run in parallel
pnpm launch

# 3. After workers finish — review merge order
pnpm review-merge

# 4. Merge branches in the recommended order
git checkout main && git merge --no-ff fix/<branch>
```

**Exiting tmux:** `Ctrl+b` then `d` to detach. `tmux attach -t multi-agent` to reattach.
