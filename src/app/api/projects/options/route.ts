import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId } from "@/lib/viewer";
import { listDemoItems } from "@/lib/demo-store";
import { DEMO_ITEMS } from "@/lib/demo-data";

/** Lightweight options list for the QuickCapture project picker. */
export async function GET() {
  const userId = await getViewerId();
  let rows: Array<{ id: string; title: string | null }> = [];
  try {
    rows = await db
      .select({ id: items.id, title: items.title })
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.kind, "project")))
      .orderBy(desc(items.updatedAt))
      .limit(50);
  } catch {
    /* fall through */
  }
  if (rows.length === 0) {
    const projects = [
      ...listDemoItems(userId).filter((i) => i.kind === "project"),
      ...DEMO_ITEMS.filter((i) => i.kind === "project"),
    ];
    rows = projects.map((p) => ({ id: p.id, title: p.title }));
  }
  return Response.json({ projects: rows });
}
