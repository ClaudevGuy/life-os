/**
 * Side-effects that fire when items are captured. Right now: when a note's
 * body contains a [[Person Name]] wiki-link, we bump that person's
 * metadata.lastContactedAt to "now" so /people stays accurate without
 * manual updates.
 */
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  findDemoItem,
  listDemoItems,
  updateDemoItem,
  addDemoItem,
} from "@/lib/demo-store";
import { DEMO_ITEMS } from "@/lib/demo-data";

function extractWikiNames(body: string): string[] {
  const out = new Set<string>();
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const name = m[1].trim();
    if (name) out.add(name);
  }
  return [...out];
}

export async function bumpLastContactedForLinkedPeople(
  userId: string,
  body: string,
): Promise<void> {
  const names = extractWikiNames(body);
  if (names.length === 0) return;
  const now = new Date().toISOString();

  for (const name of names) {
    // Try DB first
    let updated = false;
    try {
      const [row] = await db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            eq(items.kind, "person"),
            eq(items.title, name),
          ),
        )
        .limit(1);
      if (row) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        await db
          .update(items)
          .set({
            metadata: { ...meta, lastContactedAt: now },
            updatedAt: new Date(),
          })
          .where(eq(items.id, row.id));
        updated = true;
      }
    } catch {
      /* fall through */
    }
    if (updated) continue;

    // Demo path
    const stored = listDemoItems(userId).find(
      (i) => i.kind === "person" && i.title === name,
    );
    if (stored) {
      const meta = (stored.metadata ?? {}) as Record<string, unknown>;
      updateDemoItem(userId, stored.id, {
        metadata: { ...meta, lastContactedAt: now },
      });
      continue;
    }
    const seeded = DEMO_ITEMS.find(
      (i) => i.kind === "person" && i.title === name,
    );
    if (seeded) {
      // Copy seeded → store so we can mutate it
      const meta = (seeded.metadata ?? {}) as Record<string, unknown>;
      addDemoItem(userId, {
        ...seeded,
        id: seeded.id,
        metadata: { ...meta, lastContactedAt: now },
      });
    }
  }
}
