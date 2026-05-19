import { streamText } from "ai";
import { getViewerId } from "@/lib/viewer";
import { searchItems } from "@/lib/search";
import { demoUniverse } from "@/lib/viewer";
import { z } from "zod";

const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4.5";

const bodySchema = z.object({
  question: z.string().min(1).max(2_000),
});

export async function POST(req: Request) {
  const userId = await getViewerId();
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { question } = parsed.data;

  // Retrieve context: try semantic search via DB+pgvector; fall back to lexical
  // over the demo universe so /ask works without a DB.
  let context: Array<{
    id: string;
    title: string | null;
    summary: string | null;
    kind: string;
  }> = [];

  try {
    const hits = await searchItems({ userId, q: question, limit: 8 });
    context = hits.map((h) => ({
      id: h.id,
      title: h.title,
      summary: h.summary,
      kind: h.kind,
    }));
  } catch {
    /* fall through */
  }

  if (context.length === 0) {
    const needle = question.toLowerCase();
    context = demoUniverse(userId)
      .filter((i) => {
        const hay = [
          i.title,
          i.summary,
          i.body,
          i.topic,
          ...(i.keyPoints ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        title: i.title,
        summary: i.summary,
        kind: i.kind,
      }));

    // If still no match, take the most-recent 8 — gives the LLM something.
    if (context.length === 0) {
      context = demoUniverse(userId)
        .slice(0, 8)
        .map((i) => ({
          id: i.id,
          title: i.title,
          summary: i.summary,
          kind: i.kind,
        }));
    }
  }

  const sources = context
    .map(
      (c, i) =>
        `[${i + 1}] (${c.kind}) ${c.title ?? "untitled"} — ${c.summary ?? ""}`,
    )
    .join("\n");

  const prompt = `You are the user's second-brain assistant. Answer the question using ONLY the saved items below. Be concise. When you cite an item, use its number in square brackets, like [3]. If the items don't contain the answer, say so honestly.

SAVED ITEMS:
${sources}

QUESTION: ${question}

ANSWER:`;

  try {
    const result = streamText({
      model: TEXT_MODEL,
      prompt,
    });

    // Build a UI-friendly stream: emit sources first, then the text.
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "sources", sources: context }) + "\n",
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
        sources: context,
      },
      { status: 503 },
    );
  }
}
