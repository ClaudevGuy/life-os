/**
 * Thin proxy. Browser sends the items it wants summarised; we forward to the
 * AI Gateway and return the response. No data persists server-side.
 *
 * Auth precedence:
 *   1. Authorization: Bearer <key>  — user pasted their own key in /settings
 *   2. process.env.AI_GATEWAY_API_KEY — deployment-wide default
 *   3. Vercel's auto-injected OIDC token (only on Vercel)
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
  dueDecisions: z
    .array(
      z.object({
        title: z.string().nullable(),
        body: z.string().nullable().optional(),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const { recent, dueDecisions = [] } = parsed.data;

  if (recent.length === 0 && dueDecisions.length === 0) {
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
    "",
    "DECISIONS DUE FOR REVIEW:",
    ...dueDecisions.map(
      (d) => `- ${d.title ?? "untitled"}: ${d.body?.slice(0, 200) ?? ""}`,
    ),
  ].join("\n");

  const prompt = `Write a tight morning brief for the user based on their last 24h of captures and pending decisions. 2-4 short paragraphs. Mention the most interesting themes, point out anything to act on today, and call attention to decisions due for review. Plain prose, no headers, no bullet points.

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
