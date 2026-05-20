/**
 * Dexie wraps IndexedDB. This is the single source of truth for everything
 * the user captures — items, photo blobs — on their device.
 *
 * The shape mirrors what used to be the `items` Postgres table, minus the
 * server-only fields (`userId`, `embedding`).
 */
import Dexie, { type EntityTable } from "dexie";

export type ItemKind =
  | "note"
  | "decision"
  | "person"
  | "journal"
  | "voice"
  | "task"
  | "habit"
  | "goal"
  | "highlight"
  | "project"
  | "area"
  | "file";

export type ItemStatus = "inbox" | "active" | "archived" | "reference";

export type CapturedVia =
  | "web"
  | "api"
  | "mcp"
  | "extension"
  | "email"
  | "voice"
  | "shortcut";

export type StoredItem = {
  id: string;
  /**
   * Temporary compat shim: child components still expect the legacy `Item`
   * type which had a userId. We always set it to "local" here so the
   * StoredItem shape stays assignable to Item during the migration.
   * Phase 2g removes both this field and the legacy type.
   */
  userId: string;
  kind: ItemKind;
  title: string | null;
  body: string | null;
  sourceUrl: string | null;
  capturedVia: CapturedVia;
  capturedAt: Date;
  status: ItemStatus;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  rawText: string | null;
  summary: string | null;
  keyPoints: string[] | null;
  topic: string | null;
  estMinutes: number | null;
  difficulty: string | null;
  /** Legacy field carried for type compat. Always null in the new store. */
  embedding: number[] | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredBlob = {
  id: string;
  type: string;
  bytes: number;
  data: Blob;
  createdAt: Date;
};

/**
 * Soft-delete marker. When an item is deleted we also write one of these so
 * the deletion can propagate during sync. Without tombstones, a remote stale
 * copy of an item would resurrect it on next pull.
 */
export type StoredTombstone = {
  id: string;
  deletedAt: Date;
};

class LifeOSDB extends Dexie {
  items!: EntityTable<StoredItem, "id">;
  blobs!: EntityTable<StoredBlob, "id">;
  tombstones!: EntityTable<StoredTombstone, "id">;

  constructor() {
    super("life-os");
    this.version(1).stores({
      // Primary key first, then secondary indexes. Compound `[kind+status]`
      // covers the common "all tasks not yet done" style query.
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
    });
    // v2: add tombstones for sync deletes.
    this.version(2).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
    });
  }
}

export const db = new LifeOSDB();
