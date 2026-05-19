import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, sql, desc, ilike, or } from "drizzle-orm";
import { embedText } from "@/lib/enrich/ai";

export type SearchHit = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  topic: string | null;
  sourceUrl: string | null;
  capturedAt: Date;
  score: number;
};

/**
 * Hybrid search:
 *   - Always runs a substring ILIKE pass over title/summary/body/key_points
 *   - If query text embeds successfully, also runs pgvector cosine similarity
 *   - Combines and dedupes by id; ranks by (vector score + lexical hit count)
 */
export async function searchItems(args: {
  userId: string;
  q: string;
  limit?: number;
}): Promise<SearchHit[]> {
  const q = args.q.trim();
  if (!q) return [];
  const limit = args.limit ?? 20;
  const like = `%${q}%`;

  const lexicalRows = await db
    .select({
      id: items.id,
      kind: items.kind,
      title: items.title,
      summary: items.summary,
      topic: items.topic,
      sourceUrl: items.sourceUrl,
      capturedAt: items.capturedAt,
    })
    .from(items)
    .where(
      and(
        eq(items.userId, args.userId),
        or(
          ilike(items.title, like),
          ilike(items.summary, like),
          ilike(items.body, like),
          ilike(items.topic, like),
          sql`${items.keyPoints}::text ILIKE ${like}`,
        ),
      ),
    )
    .orderBy(desc(items.capturedAt))
    .limit(limit);

  const merged = new Map<string, SearchHit>();
  for (const r of lexicalRows) {
    merged.set(r.id, { ...r, score: 1 });
  }

  // Try semantic — if embedText returns null, skip silently.
  const queryVec = await embedText(q).catch(() => null);
  if (queryVec) {
    const vecLiteral = `[${queryVec.join(",")}]`;
    const vectorRows = await db
      .select({
        id: items.id,
        kind: items.kind,
        title: items.title,
        summary: items.summary,
        topic: items.topic,
        sourceUrl: items.sourceUrl,
        capturedAt: items.capturedAt,
        distance: sql<number>`${items.embedding} <=> ${vecLiteral}::vector`,
      })
      .from(items)
      .where(
        and(
          eq(items.userId, args.userId),
          sql`${items.embedding} IS NOT NULL`,
        ),
      )
      .orderBy(sql`${items.embedding} <=> ${vecLiteral}::vector`)
      .limit(limit);

    for (const r of vectorRows) {
      const semScore = Math.max(0, 1 - Number(r.distance));
      const existing = merged.get(r.id);
      if (existing) {
        existing.score = existing.score + semScore * 2;
      } else {
        merged.set(r.id, {
          id: r.id,
          kind: r.kind,
          title: r.title,
          summary: r.summary,
          topic: r.topic,
          sourceUrl: r.sourceUrl,
          capturedAt: r.capturedAt,
          score: semScore * 2,
        });
      }
    }
  }

  return [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
