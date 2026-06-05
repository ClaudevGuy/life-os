/**
 * The browser-side data layer. Reads/writes go straight to IndexedDB via
 * Dexie. Reactive — components using the `useFoo` hooks re-render
 * automatically when underlying data changes.
 */
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import {
  db,
  type StoredItem,
  type ItemKind,
  type ItemStatus,
  type StoredTrash,
} from "./db";
import { schedulePushIfConfigured } from "@/lib/sync/gist";

export type { StoredItem, ItemKind, ItemStatus, StoredTrash } from "./db";

// ---------- Writes ----------

export type NewItemInput = {
  kind: ItemKind;
  title?: string | null;
  body?: string | null;
  sourceUrl?: string | null;
  rawText?: string | null;
  capturedVia?: StoredItem["capturedVia"];
  status?: ItemStatus;
  metadata?: Record<string, unknown>;
  topic?: string | null;
};

export async function captureItem(input: NewItemInput): Promise<StoredItem> {
  const now = new Date();
  const item: StoredItem = {
    id: nanoid(),
    userId: "local",
    kind: input.kind,
    title: input.title ?? null,
    body: input.body ?? null,
    sourceUrl: input.sourceUrl ?? null,
    rawText: input.rawText ?? null,
    capturedVia: input.capturedVia ?? "web",
    capturedAt: now,
    status: input.status ?? "inbox",
    isPinned: false,
    metadata: input.metadata ?? {},
    summary: null,
    keyPoints: null,
    topic: input.topic ?? null,
    estMinutes: null,
    difficulty: null,
    embedding: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.items.add(item);
  schedulePushIfConfigured();
  return item;
}

export async function updateItem(
  id: string,
  patch: Partial<Omit<StoredItem, "id" | "createdAt">>,
): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: new Date() });
  schedulePushIfConfigured();
}

/**
 * Sequential writes (not a multi-table transaction). dexie-react-hooks'
 * useLiveQuery has a known cache-corruption issue when a transaction touches
 * two tables that both have live subscribers — the error surfaces as
 * "Cannot use 'in' operator to search for 'headCacheNode' in null". The
 * tombstone write is "eventually correct"; a partial failure (delete OK,
 * tombstone fails) just means the delete doesn't propagate to other devices
 * on the next sync — recoverable.
 */
export async function deleteItem(id: string): Promise<void> {
  // Soft delete: move the whole record into `trash` (so it disappears from
  // every list) but keep it recoverable. Still write a tombstone so the
  // deletion propagates on sync, exactly as before.
  const item = await db.items.get(id);
  if (item) {
    await db.trash.put({ ...item, trashedAt: new Date() });
  }
  await db.items.delete(id);
  await db.tombstones.put({ id, deletedAt: new Date() });
  schedulePushIfConfigured();
}

/** Move a trashed item back into the live store. */
export async function restoreItem(id: string): Promise<void> {
  const t = await db.trash.get(id);
  if (!t) return;
  const { trashedAt: _trashedAt, ...item } = t;
  void _trashedAt;
  await db.items.put({ ...item, updatedAt: new Date() });
  await db.trash.delete(id);
  // Cancel the tombstone so sync doesn't re-delete the restored item.
  await db.tombstones.delete(id);
  schedulePushIfConfigured();
}

/** Permanently remove a single trashed item. */
export async function deleteForever(id: string): Promise<void> {
  await db.trash.delete(id);
  await db.tombstones.put({ id, deletedAt: new Date() });
  schedulePushIfConfigured();
}

/** Permanently remove everything in the trash. */
export async function emptyTrash(): Promise<void> {
  const all = await db.trash.toArray();
  if (all.length === 0) return;
  const now = new Date();
  await db.tombstones.bulkPut(all.map((t) => ({ id: t.id, deletedAt: now })));
  await db.trash.clear();
  schedulePushIfConfigured();
}

/** Auto-purge trashed items older than `days`. Returns how many were purged. */
export async function purgeOldTrash(days = 30): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const old = await db.trash.where("trashedAt").below(cutoff).toArray();
  if (old.length === 0) return 0;
  const now = new Date();
  await db.tombstones.bulkPut(old.map((t) => ({ id: t.id, deletedAt: now })));
  await db.trash.bulkDelete(old.map((t) => t.id));
  schedulePushIfConfigured();
  return old.length;
}

/**
 * Restore items from a Life OS JSON export. Upserts by id (merge), reviving
 * the Date fields that JSON flattened to strings. Returns how many imported.
 */
export async function importItems(rawItems: unknown[]): Promise<number> {
  const revive = (v: unknown): Date =>
    v ? new Date(v as string) : new Date();
  const items = rawItems
    .filter(
      (r): r is StoredItem =>
        !!r &&
        typeof r === "object" &&
        typeof (r as { id?: unknown }).id === "string",
    )
    .map((r) => ({
      ...r,
      capturedAt: revive(r.capturedAt),
      createdAt: revive(r.createdAt),
      updatedAt: revive(r.updatedAt),
    }));
  if (items.length > 0) {
    await db.items.bulkPut(items);
    schedulePushIfConfigured();
  }
  return items.length;
}

export async function togglePin(id: string): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;
  await db.items.update(id, { isPinned: !item.isPinned, updatedAt: new Date() });
  schedulePushIfConfigured();
}

/**
 * Mark a task/reminder done (or not). Mirrors the tasks list: sets
 * `metadata.completedAt` and flips `status` so it reads as archived/struck
 * everywhere (calendar, Today, etc.).
 */
export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;
  const meta = (item.metadata ?? {}) as Record<string, unknown>;
  await db.items.update(id, {
    metadata: { ...meta, completedAt: done ? new Date().toISOString() : null },
    status: done ? "archived" : "active",
    updatedAt: new Date(),
  });
  schedulePushIfConfigured();
}

// ---------- Reads (one-shot) ----------

export async function getItem(id: string): Promise<StoredItem | null> {
  return (await db.items.get(id)) ?? null;
}

export async function listAllItems(): Promise<StoredItem[]> {
  return db.items.orderBy("capturedAt").reverse().toArray();
}

// ---------- Hooks (reactive) ----------

/** All items, newest first. */
export function useAllItems(): StoredItem[] | undefined {
  return useLiveQuery(() =>
    db.items.orderBy("capturedAt").reverse().toArray(),
  );
}

/** Trashed items, most recently deleted first. */
export function useTrash(): StoredTrash[] | undefined {
  return useLiveQuery(() =>
    db.trash.orderBy("trashedAt").reverse().toArray(),
  );
}

/** Count of items currently in the trash. */
export function useTrashCount(): number | undefined {
  return useLiveQuery(() => db.trash.count());
}

/** One item by id. Returns undefined while loading, null if not found. */
export function useItem(id: string | undefined): StoredItem | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    return (await db.items.get(id)) ?? null;
  }, [id]);
}

/**
 * Items of a specific kind, newest first.
 *
 * Reminders are stored under `kind: "task"` (with `metadata.reminder = true`)
 * so the calendar can show them with a due time. They are NOT tasks from the
 * user's perspective — exclude them from this hook so they don't pollute
 * task counts, the Tasks page, Today's "What now", etc.
 */
export function useItemsOfKind(kind: ItemKind): StoredItem[] | undefined {
  return useLiveQuery(
    async () => {
      const rows = await db.items
        .where("kind")
        .equals(kind)
        .reverse()
        .sortBy("capturedAt");
      const ordered = rows.reverse();
      if (kind !== "task") return ordered;
      return ordered.filter((it) => {
        const m = (it.metadata ?? {}) as { reminder?: boolean };
        return m.reminder !== true;
      });
    },
    [kind],
  );
}

/** All reminders (stored as tasks with metadata.reminder = true), newest first. */
export function useReminders(): StoredItem[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.items
      .where("kind")
      .equals("task")
      .reverse()
      .sortBy("capturedAt");
    return rows.reverse().filter((it) => {
      const m = (it.metadata ?? {}) as { reminder?: boolean };
      return m.reminder === true;
    });
  });
}

/** Inbox: things still in `status === "inbox"` plus quick-capture kinds. */
export function useInboxItems(): StoredItem[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.items.orderBy("capturedAt").reverse().toArray();
    return all.filter((i) => {
      // Reminders are tasks with a date — they live on the calendar/Today,
      // never in the triage inbox.
      const meta = (i.metadata ?? {}) as { reminder?: boolean };
      if (i.kind === "task" && meta.reminder === true) return false;
      return i.status === "inbox" || i.kind === "highlight";
    });
  });
}

/** Items captured in the last N hours, newest first. */
export function useRecentItems(hours: number): StoredItem[] | undefined {
  return useLiveQuery(async () => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const rows = await db.items
      .where("capturedAt")
      .above(since)
      .reverse()
      .sortBy("capturedAt");
    return rows.reverse();
  }, [hours]);
}

/** Today's journal entry if it exists. */
export function useJournalToday(): StoredItem | null | undefined {
  return useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const rows = await db.items
      .where("kind")
      .equals("journal")
      .and((i) => i.capturedAt >= start)
      .reverse()
      .sortBy("capturedAt");
    return rows[0] ?? null;
  });
}

/** Decisions due for review (pending outcome + reviewAt <= now). */
export function useDecisionsDue(): StoredItem[] | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const rows = await db.items.where("kind").equals("decision").toArray();
    return rows.filter((d) => {
      const m = (d.metadata ?? {}) as { reviewAt?: string; outcome?: string };
      if ((m.outcome ?? "pending") !== "pending") return false;
      return m.reviewAt ? new Date(m.reviewAt).getTime() <= now : false;
    });
  });
}

/** Old highlights worth re-surfacing (>= 7 days old). */
export function useOldHighlights(): StoredItem[] | undefined {
  return useLiveQuery(async () => {
    const cutoff = Date.now() - 7 * 86_400_000;
    const rows = await db.items.where("kind").equals("highlight").toArray();
    return rows.filter((h) => h.capturedAt.getTime() < cutoff);
  });
}

/** Items captured on this calendar day in previous months/years. */
export function useOnThisDay(): StoredItem[] | undefined {
  return useLiveQuery(async () => {
    const today = new Date();
    const rows = await db.items.toArray();
    return rows.filter((r) => {
      const d = new Date(r.capturedAt);
      if (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth()
      ) {
        return false;
      }
      return d.getDate() === today.getDate();
    });
  });
}

/** Last N days of capture counts, oldest → newest. */
export function useWeekCounts(days = 7): number[] | undefined {
  return useLiveQuery(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const cutoff = new Date(start.getTime() - (days - 1) * 86_400_000);
    const rows = await db.items.where("capturedAt").above(cutoff).toArray();
    const counts = new Array<number>(days).fill(0);
    for (const r of rows) {
      const d = new Date(r.capturedAt);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((start.getTime() - d.getTime()) / 86_400_000);
      if (diff >= 0 && diff < days) counts[days - 1 - diff]++;
    }
    return counts;
  }, [days]);
}
