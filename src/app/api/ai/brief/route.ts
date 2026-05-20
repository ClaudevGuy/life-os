/**
 * Thin proxy. Browser sends recent items; we forward to the AI Gateway and
 * return the response. No data persists server-side.
 *
 * Auth precedence:
 *   1. Authorization: Bearer <key>  — user pasted their own key in /settings
 *   2. process.env.AI_GATEWAY_API_KEY — local fallback
 *
 * ⚠ Deployment note: Life OS is designed to run locally. If you ever expose
 * this route publicly with AI_GATEWAY_API_KEY set, anyone hitting the URL
 * can spend your quota. Add IP-based rate limiting (e.g. Upstash Redis) or
 * require Authorization on every request before exposing.
 */
import { generateText } from "ai";
import { z } from "zod";
import { bearerKey, providerWithKey } from "@/lib/ai-provider";

const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4.5";

const bodySchema = z.object({
  recent: z
    .array(
      z.object({
        kind: z.string(),
        title: z.string().nullable(),
        topic: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
        body: z.string().nullable().optional(),
      }),
    )
    .max(50),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { recent } = parsed.data;

  if (recent.length === 0) {
    return Response.json({ brief: "Nothing new to summarise yet." });
  }

  const lines = [
    "RECENT CAPTURES (last 24h):",
    ...recent.map(
      (i) =>
        `- [${i.kind}] ${i.title ?? "untitled"}${i.topic ? ` (#${i.topic})` : ""}: ${
          i.summary ?? i.body?.slice(0, 200) ?? ""
        }`,
    ),
  ].join("\n");

  const prompt = `Write a tight morning brief for the user based on their last 24h of captures. 2-4 short paragraphs. Mention the most interesting themes and point out anything worth acting on today. Plain prose, no headers, no bullet points.

${lines}`;

  try {
    const userKey = bearerKey(req);
    const model = providerWithKey(TEXT_MODEL, userKey);
    const { text } = await generateText({ model, prompt });
    return Response.json({ brief: text });
  } catch (err) {
    return Response.json(
      {
        error: "ai_unavailable",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    );
  }
}
