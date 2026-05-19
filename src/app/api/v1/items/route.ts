import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db/client";
import { items, type ItemKind, type ItemStatus } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as ItemKind | null;
  const status = url.searchParams.get("status") as ItemStatus | null;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  const conditions = [eq(items.userId, userId)];
  if (kind) conditions.push(eq(items.kind, kind));
  if (status) conditions.push(eq(items.status, status));

  const rows = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.capturedAt))
    .limit(limit);

  return Response.json({ items: rows });
}
