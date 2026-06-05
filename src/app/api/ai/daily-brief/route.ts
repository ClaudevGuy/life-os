/**
 * Daily-brief narrator. The browser sends a flat fact summary built from local
 * data; we stream back a short, warm morning brief. No tools, no persistence.
 */
import { streamText } from "ai";
import { z } from "zod";
import { buildModel } from "@/lib/ai-provider";

const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4-5";

const bodySchema = z.object({
  summary: z.string().min(1).max(4000),
  date: z.string().optional(),
  name: z.string().optional(),
});

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { summary, date } = parsed.data;

  const system = `You are the user's calm, sharp daily companion inside Life OS. Write a SHORT morning brief — 2 to 3 short paragraphs, warm, second person, plain prose with no headers or bullet points. Lead with what matters most today, gently flag anything slipping (overdue, stale goals), weave in a number or two if notable (net worth, sleep), and end on one encouraging, concrete nudge. Use ONLY the facts below — never invent anything. Today is ${date ?? "today"}.`;

  try {
    const model = buildModel(TEXT_MODEL, req);
    const result = streamText({ model, system, prompt: summary });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of result.textStream) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          /* end of stream */
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return Response.json(
      { error: "ai_unavailable", detail: errMsg(err) },
      { status: 503 },
    );
  }
}
