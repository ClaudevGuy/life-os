import { auth } from "@/auth";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));

  return Response.json({ ok: true });
}
