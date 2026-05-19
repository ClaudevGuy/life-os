import { getViewerId } from "@/lib/viewer";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  addDemoItem,
  findDemoItem,
  updateDemoItem,
} from "@/lib/demo-store";

const bodySchema = z.object({
  id: z.string().optional(),
  body: z.string().min(1).max(10_000),
  energy: z.number().int().min(1).max(5),
  mood: z.string().max(8),
  photos: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const userId = await getViewerId();
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { id, body, energy, mood, photos } = parsed.data;
  const metadata: Record<string, unknown> = { energy, mood };
  if (photos && photos.length > 0) metadata.photos = photos;

  // Try DB first, then demo-store fallback.
  if (id) {
    try {
      const [updated] = await db
        .update(items)
        .set({ body, metadata, updatedAt: new Date() })
        .where(and(eq(items.id, id), eq(items.userId, userId)))
        .returning();
      if (updated) return Response.json({ item: updated });
    } catch {
      /* fall through */
    }
    const stored = findDemoItem(userId, id);
    if (stored) {
      const updated = updateDemoItem(userId, id, { body, metadata });
      return Response.json({ item: updated });
    }
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  try {
    const [row] = await db
      .insert(items)
      .values({
        id: crypto.randomUUID(),
        userId,
        kind: "journal",
        title: today,
        body,
        capturedVia: "web",
        status: "active",
        metadata,
      })
      .returning();
    if (row) return Response.json({ item: row });
  } catch {
    /* fall through */
  }

  const created = addDemoItem(userId, {
    kind: "journal",
    title: today,
    body,
    status: "active",
    capturedVia: "web",
    metadata,
  });
  return Response.json({ item: created });
}
