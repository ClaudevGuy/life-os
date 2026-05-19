import { generateText, embed, Output } from "ai";
import { z } from "zod";
import type { ItemKind } from "@/db/schema";

/**
 * AI calls route through the Vercel AI Gateway.
 * Auth: VERCEL_OIDC_TOKEN on Vercel deploys (zero-config) or
 *       AI_GATEWAY_API_KEY locally (run `vercel env pull .env.local`).
 *
 * Model slugs use the gateway dotted format (e.g. claude-haiku-4.5).
 */
const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4.5";
const EMBED_MODEL =
  process.env.LIFEOS_EMBED_MODEL ?? "openai/text-embedding-3-small";

const enrichSchema = z.object({
  title: z.string().describe("Concise, scannable title (max 80 chars)"),
  summary: z.string().describe("2-3 sentence summary"),
  keyPoints: z
    .array(z.string())
    .max(6)
    .describe("Bullet-point key takeaways, max 6"),
  topic: z
    .string()
    .describe("Single-word or hyphenated topic, e.g. 'agent-ux'"),
  tags: z
    .array(z.string())
    .max(6)
    .describe("Lowercase hyphenated tags, max 6"),
  estMinutes: z
    .number()
    .int()
    .nullable()
    .describe("Estimated minutes to read/watch, null if unknown"),
  difficulty: z
    .enum(["easy", "medium", "hard"])
    .nullable()
    .describe("Difficulty if it's learning material, else null"),
});

export type Enrichment = z.infer<typeof enrichSchema>;

export async function distill(input: {
  kind: ItemKind;
  sourceUrl?: string | null;
  body?: string | null;
  rawText?: string | null;
  hintTitle?: string | null;
}): Promise<Enrichment> {
  const content = [
    input.hintTitle && `Title hint: ${input.hintTitle}`,
    input.sourceUrl && `Source: ${input.sourceUrl}`,
    input.body && `Body:\n${input.body}`,
    input.rawText && `Content:\n${input.rawText.slice(0, 12_000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = `You are enriching a saved item in a personal knowledge system.
The user captured this as kind="${input.kind}". Extract structured metadata.

Be concise. Tags must be lowercase, hyphenated, generic enough to cluster items.
If this is a person, the title is their display name. If a decision, title is
the question being decided. If a journal entry, title is one phrase describing
the day.

${content}`;

  const { output } = await generateText({
    model: TEXT_MODEL,
    output: Output.object({ schema: enrichSchema }),
    prompt,
  });

  return output as Enrichment;
}

/** Returns null if no value to embed or the gateway is unreachable. */
export async function embedText(text: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  const value = text.slice(0, 8_000);
  try {
    const { embedding } = await embed({
      model: EMBED_MODEL,
      value,
    });
    return embedding;
  } catch (err) {
    console.error("[embed] failed:", err);
    return null;
  }
}

const connectionSchema = z.object({
  kind: z.enum(["echo", "contradict", "references", "follows_up", "none"]),
  reason: z.string().max(180),
});

export type ConnectionVerdict = z.infer<typeof connectionSchema>;

export async function classifyConnection(args: {
  a: { title?: string | null; summary?: string | null };
  b: { title?: string | null; summary?: string | null };
}): Promise<ConnectionVerdict> {
  const { output } = await generateText({
    model: TEXT_MODEL,
    output: Output.object({ schema: connectionSchema }),
    prompt: `Classify the relationship between two saved items.

ITEM A:
${args.a.title ?? ""}
${args.a.summary ?? ""}

ITEM B:
${args.b.title ?? ""}
${args.b.summary ?? ""}

Pick:
- echo: A and B make the same point
- contradict: A and B disagree
- references: A explicitly builds on or cites B
- follows_up: B is a natural next-step from A
- none: nothing meaningful

Give a one-line reason (max 180 chars).`,
  });

  return output as ConnectionVerdict;
}
