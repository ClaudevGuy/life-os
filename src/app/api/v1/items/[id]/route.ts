import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }
  const { id } = await ctx.params;

  const [row] = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.id, id)))
    .limit(1);
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ item: row });
}

const patchSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["inbox", "active", "archived", "reference"]).optional(),
  isPinned: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }
  const { id } = await ctx.params;
  const raw = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(items)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(items.userId, userId), eq(items.id, id)))
    .returning();

  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ item: row });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }
  const { id } = await ctx.params;
  await db
    .delete(items)
    .where(and(eq(items.userId, userId), eq(items.id, id)));
  return Response.json({ ok: true });
}
