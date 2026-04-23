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
