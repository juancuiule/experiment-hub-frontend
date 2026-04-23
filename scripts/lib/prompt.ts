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
- Never touch config files: .claude/, package.json, .gitignore, tsconfig.json, scripts/
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
