import { nanoid } from "nanoid";
import { db } from "@/db/client";
import { items, tags, itemTags, type ItemKind } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  addDemoItem,
  listDemoItems,
  findDemoItem,
  updateDemoItem,
  removeDemoItem,
} from "@/lib/demo-store";

export type CaptureInput = {
  userId: string;
  kind: ItemKind;
  title?: string | null;
  body?: string | null;
  sourceUrl?: string | null;
  rawText?: string | null;
  capturedVia?:
    | "web"
    | "api"
    | "mcp"
    | "extension"
    | "email"
    | "voice"
    | "shortcut";
  metadata?: Record<string, unknown>;
};

export async function captureItem(input: CaptureInput) {
  // Try DB first; on any failure, fall back to the demo store so the UI works.
  try {
    if (input.sourceUrl) {
      const existing = await db
        .select()
        .from(items)
        .where(and(eq(items.userId, input.userId), eq(items.sourceUrl, input.sourceUrl)))
        .limit(1);
      if (existing[0]) return { item: existing[0], duplicate: true as const };
    }

    const [row] = await db
      .insert(items)
      .values({
        id: nanoid(),
        userId: input.userId,
        kind: input.kind,
        title: input.title ?? null,
        body: input.body ?? null,
        sourceUrl: input.sourceUrl ?? null,
        rawText: input.rawText ?? null,
        capturedVia: input.capturedVia ?? "web",
        metadata: input.metadata ?? {},
      })
      .returning();

    return { item: row, duplicate: false as const };
  } catch {
    const item = addDemoItem(input.userId, {
      kind: input.kind,
      title: input.title ?? null,
      body: input.body ?? null,
      sourceUrl: input.sourceUrl ?? null,
      capturedVia: input.capturedVia ?? "web",
      metadata: input.metadata ?? {},
    });
    return { item, duplicate: false as const };
  }
}

export async function attachTags(opts: {
  userId: string;
  itemId: string;
  tagNames: string[];
}) {
  const cleaned = Array.from(
    new Set(
      opts.tagNames
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length < 40),
    ),
  );
  if (cleaned.length === 0) return;

  try {
    for (const name of cleaned) {
      const [tag] = await db
        .insert(tags)
        .values({ userId: opts.userId, name })
        .onConflictDoNothing()
        .returning();
      let tagId = tag?.id;
      if (!tagId) {
        const [found] = await db
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.userId, opts.userId), eq(tags.name, name)))
          .limit(1);
        tagId = found?.id;
      }
      if (!tagId) continue;
      await db
        .insert(itemTags)
        .values({ itemId: opts.itemId, tagId })
        .onConflictDoNothing();
    }
  } catch {
    // ignore in demo mode
  }
}

export async function listInbox(userId: string, limit = 50) {
  return db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.status, "inbox")))
    .orderBy(desc(items.capturedAt))
    .limit(limit);
}

export async function getItem(userId: string, id: string) {
  try {
    const [row] = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.id, id)))
      .limit(1);
    if (row) return row;
  } catch {
    // fall through
  }
  return findDemoItem(userId, id);
}

// Demo-store convenience re-exports for pages that need to merge.
export { listDemoItems, findDemoItem, updateDemoItem, removeDemoItem };
