/**
 * Session-scoped item endpoints used by in-app edit/delete buttons.
 * Distinct from /api/v1/items/[id] which is the bearer-token external API.
 * Both eventually share the same data path; on DB failure we fall back to
 * the local persistence store.
 */
import { z } from "zod";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getViewerId } from "@/lib/viewer";
import {
  findDemoItem,
  updateDemoItem,
  removeDemoItem,
  addDemoItem,
} from "@/lib/demo-store";
import { DEMO_ITEMS } from "@/lib/demo-data";

const patchSchema = z.object({
  title: z.string().max(280).optional(),
  body: z.string().max(50_000).optional(),
  status: z.enum(["inbox", "active", "archived", "reference"]).optional(),
  isPinned: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getViewerId();
  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Try real DB.
  try {
    const [row] = await db
      .update(items)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(items.userId, userId), eq(items.id, id)))
      .returning();
    if (row) return Response.json({ item: row });
  } catch {
    // fall through to demo store
  }

  // Local-mode path: mutate the persistence store. If the item was a seeded
  // demo (no entry in the user store), copy it in first so we can mutate it.
  const stored = findDemoItem(userId, id);
  if (stored) {
    const updated = updateDemoItem(userId, id, parsed.data);
    if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ item: updated });
  }
  const seeded = DEMO_ITEMS.find((d) => d.id === id);
  if (seeded) {
    const copied = addDemoItem(userId, {
      ...seeded,
      ...parsed.data,
      id: seeded.id,
    });
    return Response.json({ item: copied });
  }
  return Response.json({ error: "not_found" }, { status: 404 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getViewerId();
  const { id } = await ctx.params;
  try {
    await db
      .delete(items)
      .where(and(eq(items.userId, userId), eq(items.id, id)));
  } catch {
    /* fall through */
  }
  removeDemoItem(userId, id);
  return Response.json({ ok: true });
}
