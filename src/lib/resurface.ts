import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, isNotNull, lt, sql, desc } from "drizzle-orm";

/**
 * Pick a small number of older items that are semantically close to anything
 * captured in the last 7 days. Used by the daily brief + ⌘K to resurface
 * forgotten gems.
 *
 * Phase 2: schedule via Vercel Cron, store flag on item.metadata.resurface.
 */
export async function pickResurfaceCandidates(
  userId: string,
  limit = 3,
): Promise<Array<{ id: string; title: string | null; reason: string }>> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Centroid of recent embeddings.
  const recent = await db
    .select({ embedding: items.embedding })
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        isNotNull(items.embedding),
        sql`${items.capturedAt} >= ${sevenDaysAgo}`,
      ),
    )
    .limit(50);

  const embedded = recent.filter(
    (r): r is { embedding: number[] } => Array.isArray(r.embedding),
  );
  if (embedded.length === 0) return [];

  const dim = embedded[0].embedding.length;
  const centroid = new Array(dim).fill(0);
  for (const r of embedded) {
    for (let i = 0; i < dim; i++) centroid[i] += r.embedding[i];
  }
  for (let i = 0; i < dim; i++) centroid[i] /= embedded.length;
  const centroidLiteral = `[${centroid.join(",")}]`;

  // Old items closest to that centroid.
  const candidates = await db
    .select({
      id: items.id,
      title: items.title,
      summary: items.summary,
      topic: items.topic,
      distance: sql<number>`${items.embedding} <=> ${centroidLiteral}::vector`,
    })
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        isNotNull(items.embedding),
        lt(items.capturedAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(sql`1 - (${items.embedding} <=> ${centroidLiteral}::vector)`))
    .limit(limit);

  return candidates.map((c) => ({
    id: c.id,
    title: c.title,
    reason: c.topic
      ? `Relevant to recent #${c.topic} work`
      : "Semantically close to recent captures",
  }));
}
