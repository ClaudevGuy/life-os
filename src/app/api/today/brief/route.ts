import { auth } from "@/auth";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, gte, desc, or, sql } from "drizzle-orm";
import { generateText } from "ai";

const TEXT_MODEL =
  process.env.LIFEOS_TEXT_MODEL ?? "anthropic/claude-haiku-4.5";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recent = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), gte(items.capturedAt, oneDayAgo)))
    .orderBy(desc(items.capturedAt))
    .limit(20);

  const dueDecisions = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        eq(items.kind, "decision"),
        or(
          sql`(${items.metadata} ->> 'outcome') = 'pending'`,
          sql`(${items.metadata} ->> 'outcome') IS NULL`,
        ),
        sql`(${items.metadata} ->> 'reviewAt')::timestamptz <= now()`,
      ),
    )
    .limit(10);

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

  const { text } = await generateText({
    model: TEXT_MODEL,
    prompt,
  });

  return Response.json({ brief: text });
}
