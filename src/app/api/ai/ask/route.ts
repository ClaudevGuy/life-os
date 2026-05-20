/**
 * Thin proxy. Browser sends the question plus the items it wants the model
 * to consult; we stream the answer back. No data persists server-side.
 *
 * Auth precedence:
 *   1. Authorization: Bearer <key>  — user pasted their own key in /settings
 *   2. process.env.AI_GATEWAY_API_KEY — local fallback
 *
 * ⚠ Same deployment caveat as /api/ai/brief — local use only unless you
 * add rate limiting / per-request auth before exposing this URL publicly.
 */
import { streamText } from "ai";
import { z } from "zod";
import { bearerKey, providerWithKey } from "@/lib/ai-provider";

const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4.5";

const itemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
});

const bodySchema = z.object({
  question: z.string().min(1).max(2_000),
  items: z.array(itemSchema).max(40),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { question, items } = parsed.data;

  const sources = items
    .map(
      (c, i) =>
        `[${i + 1}] (${c.kind}) ${c.title ?? "untitled"} — ${c.summary ?? c.body ?? ""}`,
    )
    .join("\n");

  const prompt = `You are the user's second-brain assistant. Answer the question using ONLY the saved items below. Be concise. When you cite an item, use its number in square brackets, like [3]. If the items don't contain the answer, say so honestly.

SAVED ITEMS:
${sources}

QUESTION: ${question}

ANSWER:`;

  try {
    const userKey = bearerKey(req);
    const model = providerWithKey(TEXT_MODEL, userKey);
    const result = streamText({ model, prompt });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "sources",
              sources: items.map((i) => ({
                id: i.id,
                kind: i.kind,
                title: i.title,
                summary: i.summary ?? null,
              })),
            }) + "\n",
          ),
        );
        for await (const chunk of result.textStream) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "text", text: chunk }) + "\n"),
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return Response.json(
      {
        error: "ai_unavailable",
        detail: err instanceof Error ? err.message : "unknown",
        sources: items.map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          summary: i.summary ?? null,
        })),
      },
      { status: 503 },
    );
  }
}
