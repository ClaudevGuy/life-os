/**
 * Multi-device sync via a private GitHub Gist.
 *
 * Each device pushes a JSON snapshot of its IndexedDB to the same private
 * gist, and pulls the gist back on focus / on a timer to merge in changes
 * from other devices. Per-item updatedAt wins on conflicts; tombstones
 * suppress resurrections of deleted items.
 *
 * Photos / blobs are NOT synced in v1 — they stay local to each device.
 *
 * GitHub PAT scope required: `gist`.
 */
"use client";

import { db, type StoredItem, type StoredTombstone } from "@/lib/store/db";
import {
  getSyncToken,
  getSyncGistId,
  setSyncGistId,
  setLastPushedAt,
  setLastPulledAt,
  setLastSyncError,
} from "./state";

const GIST_FILENAME = "lifeos.json";
const GIST_DESCRIPTION = "life-os · sync (do not edit manually)";
const GH_API = "https://api.github.com";
const GH_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

type WireItem = Omit<StoredItem, "capturedAt" | "createdAt" | "updatedAt"> & {
  capturedAt: string;
  createdAt: string;
  updatedAt: string;
};
type WireTombstone = { id: string; deletedAt: string };

type GistShape = {
  version: 1;
  pushedAt: string;
  items: WireItem[];
  tombstones: WireTombstone[];
};

// ---------- token verification ----------

export async function verifyToken(token: string): Promise<{
  ok: boolean;
  login?: string;
  scopes?: string[];
  error?: string;
}> {
  try {
    const res = await fetch(`${GH_API}/user`, { headers: GH_HEADERS(token) });
    if (!res.ok) {
      return { ok: false, error: `${res.status} ${res.statusText}` };
    }
    const user = (await res.json()) as { login: string };
    const scopes = (res.headers.get("X-OAuth-Scopes") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!scopes.includes("gist")) {
      return {
        ok: false,
        login: user.login,
        scopes,
        error: "Token is missing the `gist` scope.",
      };
    }
    return { ok: true, login: user.login, scopes };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// ---------- gist discovery / read / write ----------

async function findExistingGist(token: string): Promise<string | null> {
  const res = await fetch(`${GH_API}/gists?per_page=100`, {
    headers: GH_HEADERS(token),
  });
  if (!res.ok) return null;
  const gists = (await res.json()) as Array<{
    id: string;
    description: string | null;
    files: Record<string, unknown>;
  }>;
  const match = gists.find(
    (g) => g.description === GIST_DESCRIPTION || GIST_FILENAME in (g.files ?? {}),
  );
  return match?.id ?? null;
}

async function readGist(
  token: string,
  gistId: string,
): Promise<GistShape | null> {
  const res = await fetch(`${GH_API}/gists/${gistId}`, {
    headers: GH_HEADERS(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gist read failed: ${res.status}`);
  const json = (await res.json()) as {
    files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };
  const file = json.files?.[GIST_FILENAME];
  if (!file) return null;
  let content = file.content ?? "";
  // GitHub truncates files larger than ~1 MB in the gist response — fetch raw.
  if (file.truncated && file.raw_url) {
    const raw = await fetch(file.raw_url);
    content = await raw.text();
  }
  if (!content.trim()) return null;
  try {
    return JSON.parse(content) as GistShape;
  } catch {
    return null;
  }
}

async function writeGist(
  token: string,
  gistId: string | null,
  data: GistShape,
): Promise<{ gistId: string }> {
  const body = {
    description: GIST_DESCRIPTION,
    files: { [GIST_FILENAME]: { content: JSON.stringify(data) } },
    public: false,
  };
  const url = gistId ? `${GH_API}/gists/${gistId}` : `${GH_API}/gists`;
  const res = await fetch(url, {
    method: gistId ? "PATCH" : "POST",
    headers: GH_HEADERS(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gist write failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id: string };
  return { gistId: json.id };
}

// ---------- (de)serialization ----------

function serializeItem(i: StoredItem): WireItem {
  return {
    ...i,
    capturedAt: i.capturedAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

function deserializeItem(w: WireItem): StoredItem {
  return {
    ...w,
    capturedAt: new Date(w.capturedAt),
    createdAt: new Date(w.createdAt),
    updatedAt: new Date(w.updatedAt),
  };
}

// ---------- merge ----------

type MergeResult = {
  mergedItems: StoredItem[];
  mergedTombstones: StoredTombstone[];
  stats: { added: number; updated: number; deleted: number };
};

function mergeSnapshot(
  localItems: StoredItem[],
  localTombstones: StoredTombstone[],
  remote: GistShape | null,
): MergeResult {
  const stats = { added: 0, updated: 0, deleted: 0 };

  // Combine tombstones first (latest deletedAt wins per id).
  const tombMap = new Map<string, StoredTombstone>();
  for (const t of localTombstones) tombMap.set(t.id, t);
  for (const t of remote?.tombstones ?? []) {
    const existing = tombMap.get(t.id);
    const remoteAt = new Date(t.deletedAt);
    if (!existing || remoteAt > existing.deletedAt) {
      tombMap.set(t.id, { id: t.id, deletedAt: remoteAt });
    }
  }

  // Combine items: latest updatedAt wins per id.
  const itemMap = new Map<string, StoredItem>();
  for (const i of localItems) itemMap.set(i.id, i);
  for (const w of remote?.items ?? []) {
    const remoteItem = deserializeItem(w);
    const local = itemMap.get(remoteItem.id);
    if (!local) {
      itemMap.set(remoteItem.id, remoteItem);
      stats.added++;
    } else if (remoteItem.updatedAt > local.updatedAt) {
      itemMap.set(remoteItem.id, remoteItem);
      stats.updated++;
    }
  }

  // Apply tombstones — if an item has a tombstone with deletedAt >= its
  // updatedAt, remove it. This means an explicit deletion always wins over
  // older edits, regardless of which device the edit came from.
  for (const [id, t] of tombMap) {
    const item = itemMap.get(id);
    if (item && t.deletedAt >= item.updatedAt) {
      itemMap.delete(id);
      stats.deleted++;
    }
  }

  return {
    mergedItems: [...itemMap.values()],
    mergedTombstones: [...tombMap.values()],
    stats,
  };
}

// ---------- pull / push ----------

async function persistMerge(merge: MergeResult): Promise<void> {
  await db.transaction("rw", db.items, db.tombstones, async () => {
    await db.items.clear();
    if (merge.mergedItems.length > 0) {
      await db.items.bulkAdd(merge.mergedItems);
    }
    await db.tombstones.clear();
    if (merge.mergedTombstones.length > 0) {
      await db.tombstones.bulkAdd(merge.mergedTombstones);
    }
  });
}

async function pruneOldTombstones(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000);
  await db.tombstones.where("deletedAt").below(cutoff).delete();
}

export type SyncResult = {
  ok: boolean;
  gistId?: string;
  added?: number;
  updated?: number;
  deleted?: number;
  pushed?: number;
  error?: string;
};

/** One round-trip: ensure gist → pull/merge → push merged state. */
export async function syncNow(): Promise<SyncResult> {
  const token = getSyncToken();
  if (!token) return { ok: false, error: "Not connected" };

  try {
    let gistId = getSyncGistId();

    // Discover an existing sync gist on this account if we don't know one.
    if (!gistId) {
      gistId = await findExistingGist(token);
      if (gistId) setSyncGistId(gistId);
    }

    // Pull.
    let remote: GistShape | null = null;
    if (gistId) {
      try {
        remote = await readGist(token, gistId);
      } catch (err) {
        // Gist may have been deleted on GitHub. Drop the id and let push
        // recreate.
        if (err instanceof Error && /404/.test(err.message)) {
          gistId = null;
          setSyncGistId(null);
        } else {
          throw err;
        }
      }
    }

    // Merge local + remote.
    const [localItems, localTombstones] = await Promise.all([
      db.items.toArray(),
      db.tombstones.toArray(),
    ]);
    const merge = mergeSnapshot(localItems, localTombstones, remote);
    await persistMerge(merge);
    setLastPulledAt(new Date());

    // Push the merged state back.
    const payload: GistShape = {
      version: 1,
      pushedAt: new Date().toISOString(),
      items: merge.mergedItems.map(serializeItem),
      tombstones: merge.mergedTombstones.map((t) => ({
        id: t.id,
        deletedAt: t.deletedAt.toISOString(),
      })),
    };
    const { gistId: newId } = await writeGist(token, gistId, payload);
    setSyncGistId(newId);
    setLastPushedAt(new Date());
    setLastSyncError(null);

    await pruneOldTombstones();

    return {
      ok: true,
      gistId: newId,
      added: merge.stats.added,
      updated: merge.stats.updated,
      deleted: merge.stats.deleted,
      pushed: merge.mergedItems.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    setLastSyncError(msg);
    return { ok: false, error: msg };
  }
}

// ---------- lightweight pull-only path used by the auto-sync loop ----------

/**
 * Pull + merge, no push. Used by the background polling tick so we don't
 * write to GitHub once a minute when nothing changed locally.
 */
export async function pullOnly(): Promise<SyncResult> {
  const token = getSyncToken();
  const gistId = getSyncGistId();
  if (!token || !gistId) return { ok: false, error: "Not connected" };

  try {
    const remote = await readGist(token, gistId);
    if (!remote) return { ok: true, added: 0, updated: 0, deleted: 0 };

    const [localItems, localTombstones] = await Promise.all([
      db.items.toArray(),
      db.tombstones.toArray(),
    ]);
    const merge = mergeSnapshot(localItems, localTombstones, remote);
    await persistMerge(merge);
    setLastPulledAt(new Date());
    setLastSyncError(null);

    return {
      ok: true,
      added: merge.stats.added,
      updated: merge.stats.updated,
      deleted: merge.stats.deleted,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Pull failed";
    setLastSyncError(msg);
    return { ok: false, error: msg };
  }
}
