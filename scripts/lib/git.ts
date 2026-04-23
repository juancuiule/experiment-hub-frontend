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
    'find lib src app scripts -type f \\( -name "*.ts" -o -name "*.tsx" \\) | sort | grep -v node_modules | grep -v .next',
    { encoding: "utf-8" }
  ).trim();
}
