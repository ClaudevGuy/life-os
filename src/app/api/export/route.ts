import { getViewerId } from "@/lib/viewer";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listDemoItems } from "@/lib/demo-store";

/**
 * Dump everything you've captured as a single JSON file. Use this for backups
 * or to migrate your data elsewhere.
 */
export async function GET() {
  const userId = await getViewerId();
  let rows: unknown[] = [];
  try {
    rows = await db.select().from(items).where(eq(items.userId, userId));
  } catch {
    rows = listDemoItems(userId);
  }
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: 1,
      userId,
      count: rows.length,
      items: rows,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="lifeos-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
