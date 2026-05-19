import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { distill, embedText } from "./ai";
import { attachTags } from "@/lib/items";

/**
 * Run enrichment for a single item:
 *   1. distill via LLM -> title/summary/keyPoints/topic/tags/estMinutes/difficulty
 *   2. embed concatenated text (optional, requires OPENAI_API_KEY)
 *   3. attach tags
 */
export async function enrichItem(userId: string, itemId: string) {
  const [row] = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.id, itemId)))
    .limit(1);
  if (!row) return;

  const enrichment = await distill({
    kind: row.kind,
    sourceUrl: row.sourceUrl,
    body: row.body,
    rawText: row.rawText,
    hintTitle: row.title,
  });

  const textForEmbedding = [
    enrichment.title,
    enrichment.summary,
    enrichment.keyPoints.join("\n"),
    row.body,
  ]
    .filter(Boolean)
    .join("\n\n");

  const embedding = await embedText(textForEmbedding).catch(() => null);

  await db
    .update(items)
    .set({
      title: row.title ?? enrichment.title,
      summary: enrichment.summary,
      keyPoints: enrichment.keyPoints,
      topic: enrichment.topic,
      estMinutes: enrichment.estMinutes,
      difficulty: enrichment.difficulty,
      embedding: embedding ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));

  await attachTags({ userId, itemId, tagNames: enrichment.tags });
}
