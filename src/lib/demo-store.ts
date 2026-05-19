/**
 * Single source of truth for items when no Postgres is configured.
 * State lives in process memory; writes are mirrored to ./data/lifeos.json
 * via the persistence module, so captures survive dev-server restarts.
 *
 * If DATABASE_URL ever points at a real DB, captureItem() will succeed
 * against Postgres and never touch this store.
 */
import type { Item, ItemKind } from "@/db/schema";
import { nanoid } from "nanoid";
import { getStore, scheduleSave } from "@/lib/persistence";

export function addDemoItem(
  userId: string,
  partial: Partial<Item> & { kind: ItemKind },
): Item {
  const store = getStore();
  const now = new Date();
  const item: Item = {
    id: partial.id ?? nanoid(),
    userId,
    kind: partial.kind,
    title: partial.title ?? null,
    body: partial.body ?? null,
    sourceUrl: partial.sourceUrl ?? null,
    capturedVia: partial.capturedVia ?? "web",
    capturedAt: partial.capturedAt ?? now,
    status: partial.status ?? "inbox",
    isPinned: partial.isPinned ?? false,
    metadata: partial.metadata ?? {},
    rawText: partial.rawText ?? null,
    summary: partial.summary ?? null,
    keyPoints: partial.keyPoints ?? null,
    topic: partial.topic ?? null,
    estMinutes: partial.estMinutes ?? null,
    difficulty: partial.difficulty ?? null,
    embedding: partial.embedding ?? null,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
  const arr = store.get(userId) ?? [];
  arr.unshift(item);
  store.set(userId, arr);
  scheduleSave();
  return item;
}

export function listDemoItems(userId: string): Item[] {
  return getStore().get(userId) ?? [];
}

export function updateDemoItem(
  userId: string,
  id: string,
  patch: Partial<Item>,
): Item | null {
  const store = getStore();
  const arr = store.get(userId);
  if (!arr) return null;
  const idx = arr.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch, updatedAt: new Date() };
  scheduleSave();
  return arr[idx];
}

export function findDemoItem(userId: string, id: string): Item | null {
  return getStore().get(userId)?.find((i) => i.id === id) ?? null;
}

export function removeDemoItem(userId: string, id: string): boolean {
  const store = getStore();
  const arr = store.get(userId);
  if (!arr) return false;
  const idx = arr.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  arr.splice(idx, 1);
  scheduleSave();
  return true;
}
