import { getViewerId } from "@/lib/viewer";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getViewerId();
  const { id } = await ctx.params;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [row] = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.id, id)))
      .limit(1);
    if (!row) return Response.json({ error: "not_found" }, { status: 404 });

    const meta = (row.metadata ?? {}) as { checkins?: string[] };
    const set = new Set(meta.checkins ?? []);
    if (set.has(today)) set.delete(today);
    else set.add(today);

    await db
      .update(items)
      .set({
        metadata: { ...meta, checkins: [...set] },
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.userId, userId)));

    return Response.json({ ok: true, checkins: [...set] });
  } catch {
    return Response.json({ ok: true, demo: true });
  }
}
