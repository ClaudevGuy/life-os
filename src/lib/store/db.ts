/**
 * Dexie wraps IndexedDB. This is the single source of truth for everything
 * the user captures — items, photo blobs — on their device.
 *
 * The shape mirrors what used to be the `items` Postgres table, minus the
 * server-only fields (`userId`, `embedding`).
 */
import Dexie, { type EntityTable } from "dexie";
import type { Exercise, Routine, Workout } from "@/lib/gym/types";

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
  | "file"
  | "subscription"
  | "bookmark"
  | "account"
  | "holding";

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

/**
 * A soft-deleted item. `deleteItem` moves the whole record here (and out of
 * `items`) so it vanishes from every list automatically but can still be
 * restored. Permanent deletion clears it from here.
 */
export type StoredTrash = StoredItem & { trashedAt: Date };

/**
 * A free-text scratchpad attached to a calendar day (keyed by YYYY-MM-DD).
 * Talking points, reminders-to-self, anything you want pinned to a date.
 */
export type StoredDayNote = {
  date: string; // YYYY-MM-DD (primary key)
  body: string;
  updatedAt: Date;
};

/**
 * A daily snapshot of net worth, so the Finance page can chart a trend over
 * time. Keyed by YYYY-MM-DD; one row per day, overwritten as the day's figures
 * change. `base` records the currency the figures are expressed in so a later
 * base-currency switch doesn't silently mix scales.
 */
export type StoredNetWorthSnapshot = {
  date: string; // YYYY-MM-DD (primary key)
  base: string;
  net: number;
  assets: number;
  liabilities: number;
  updatedAt: Date;
};

/**
 * A daily health check-in, keyed by YYYY-MM-DD (one row per day). Weight is
 * always stored in kg; the UI converts for display.
 */
/** Small key/value store for app-level settings (e.g. the backup folder handle). */
export type StoredKV = { key: string; value: unknown };

export type StoredHealthLog = {
  date: string; // YYYY-MM-DD (primary key)
  mood?: number; // 1–5
  energy?: number; // 1–5
  sleepHours?: number;
  weightKg?: number;
  activeMin?: number;
  water?: number; // glasses
  note?: string;
  updatedAt: Date;
};

/**
 * An encrypted vault entry. Only `type` and timestamps are in the clear (for
 * filtering/sorting); the title and all fields live inside `ct`, AES-GCM
 * encrypted under the passcode-derived key. Never synced — local only.
 */
export type StoredVaultItem = {
  id: string;
  type: string; // login | card | note | codes | secret
  iv: string;
  ct: string;
  createdAt: Date;
  updatedAt: Date;
};

class LifeOSDB extends Dexie {
  items!: EntityTable<StoredItem, "id">;
  blobs!: EntityTable<StoredBlob, "id">;
  tombstones!: EntityTable<StoredTombstone, "id">;
  trash!: EntityTable<StoredTrash, "id">;
  dayNotes!: EntityTable<StoredDayNote, "date">;
  netWorthSnapshots!: EntityTable<StoredNetWorthSnapshot, "date">;
  vault!: EntityTable<StoredVaultItem, "id">;
  healthLogs!: EntityTable<StoredHealthLog, "date">;
  appKV!: EntityTable<StoredKV, "key">;
  exercises!: EntityTable<Exercise, "id">;
  workouts!: EntityTable<Workout, "id">;
  routines!: EntityTable<Routine, "id">;

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
    // v3: add a trash table for recoverable soft-deletes.
    this.version(3).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
    });
    // v4: per-day scratchpad notes for the calendar.
    this.version(4).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
    });
    // v5: daily net-worth snapshots for the Finance trend chart.
    this.version(5).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
      netWorthSnapshots: "date, updatedAt",
    });
    // v6: encrypted vault (local-only, never synced).
    this.version(6).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
      netWorthSnapshots: "date, updatedAt",
      vault: "id, type, updatedAt",
    });
    // v7: daily health check-ins.
    this.version(7).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
      netWorthSnapshots: "date, updatedAt",
      vault: "id, type, updatedAt",
      healthLogs: "date, updatedAt",
    });
    // v8: tiny key/value store for app settings (backup folder handle, etc.).
    this.version(8).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
      netWorthSnapshots: "date, updatedAt",
      vault: "id, type, updatedAt",
      healthLogs: "date, updatedAt",
      appKV: "key",
    });
    // v9: gym tracker — exercise library, logged workouts, routine templates.
    this.version(9).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
      netWorthSnapshots: "date, updatedAt",
      vault: "id, type, updatedAt",
      healthLogs: "date, updatedAt",
      appKV: "key",
      exercises: "id, name, muscle, type, custom",
      workouts: "id, date, focus",
      routines: "id, name",
    });
  }
}

export const db = new LifeOSDB();
