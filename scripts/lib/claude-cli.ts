import { execSync } from "child_process";

// Uses the local Claude Code CLI (claude --print) instead of the Anthropic SDK.
// Requires no API key — runs through your Claude Code subscription.
// To switch to direct API calls (with prompt caching + model control), use callOpus from ./anthropic.ts instead.
export function callClaude(systemPrompt: string, userMessage: string): string {
  const fullPrompt = `${systemPrompt}\n\n---\n\n${userMessage}`;
  return execSync("claude --print", {
    input: fullPrompt,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
}
