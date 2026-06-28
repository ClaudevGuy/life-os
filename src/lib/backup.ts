"use client";

/**
 * Backups. A complete snapshot of every table (items, day notes, net-worth
 * snapshots, and the encrypted vault + its guard) as one JSON file.
 * Optionally writes that snapshot to a folder you pick — via the File System
 * Access API — automatically, so a browser eviction can't wipe your life.
 */
import { db } from "@/lib/store/db";
import { importItems } from "@/lib/store/items";
import { ymd } from "@/lib/ymd";

const GUARD_KEY = "lifeos.vault.guard";
const LAST_KEY = "lifeos.backup.last";

interface PermHandle {
  queryPermission?(d: { mode: string }): Promise<string>;
  requestPermission?(d: { mode: string }): Promise<string>;
}
type DirHandle = FileSystemDirectoryHandle & PermHandle;

export function supportsFolderBackup(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// ── build / restore ───────────────────────────────────────────────────────────

export async function buildBackupObject() {
  const [items, dayNotes, netWorthSnapshots, vault] =
    await Promise.all([
      db.items.toArray(),
      db.dayNotes.toArray(),
      db.netWorthSnapshots.toArray(),
      db.vault.toArray(),
    ]);
  let vaultGuard: unknown = null;
  try {
    const g = localStorage.getItem(GUARD_KEY);
    if (g) vaultGuard = JSON.parse(g);
  } catch {
    /* ignore */
  }
  return {
    app: "life-os",
    schema: 8,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length },
    items,
    dayNotes,
    netWorthSnapshots,
    vault,
    vaultGuard,
  };
}

function revive<T extends Record<string, unknown>>(arr: unknown, keys: string[]): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((row) => {
    const o = { ...(row as Record<string, unknown>) };
    for (const k of keys) if (o[k]) o[k] = new Date(o[k] as string);
    return o as T;
  });
}

export async function restoreFromObject(
  data: Record<string, unknown>,
): Promise<{ items: number }> {
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data)
      ? (data as unknown[])
      : [];
  const n = await importItems(items);
  const dn = revive(data.dayNotes, ["updatedAt"]);
  if (dn.length) await db.dayNotes.bulkPut(dn as never);
  const ns = revive(data.netWorthSnapshots, ["updatedAt"]);
  if (ns.length) await db.netWorthSnapshots.bulkPut(ns as never);
  const v = revive(data.vault, ["createdAt", "updatedAt"]);
  if (v.length) await db.vault.bulkPut(v as never);
  if (data.vaultGuard) {
    try {
      localStorage.setItem(GUARD_KEY, JSON.stringify(data.vaultGuard));
    } catch {
      /* ignore */
    }
  }
  return { items: n };
}

// ── download ──────────────────────────────────────────────────────────────────

export async function downloadBackup(): Promise<void> {
  const obj = await buildBackupObject();
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lifeos-backup-${ymd(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setLastBackup();
}

// ── folder (File System Access) ────────────────────────────────────────────────

async function ensurePermission(handle: DirHandle, prompt: boolean): Promise<boolean> {
  if (!handle.queryPermission) return true;
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if (prompt && handle.requestPermission) {
    return (await handle.requestPermission(opts)) === "granted";
  }
  return false;
}

export async function pickBackupDir(): Promise<boolean> {
  if (!supportsFolderBackup()) return false;
  try {
    const picker = (
      window as unknown as {
        showDirectoryPicker: (o?: unknown) => Promise<DirHandle>;
      }
    ).showDirectoryPicker;
    const handle = await picker({ mode: "readwrite" });
    if (!(await ensurePermission(handle, true))) return false;
    await db.appKV.put({ key: "backupDir", value: handle });
    return writeBackupToDir(handle);
  } catch {
    return false;
  }
}

export async function backupDirName(): Promise<string | null> {
  try {
    const row = await db.appKV.get("backupDir");
    const h = row?.value as DirHandle | undefined;
    return h?.name ?? null;
  } catch {
    return null;
  }
}

export async function forgetBackupDir(): Promise<void> {
  try {
    await db.appKV.delete("backupDir");
  } catch {
    /* ignore */
  }
}

async function getBackupDir(prompt: boolean): Promise<DirHandle | null> {
  try {
    const row = await db.appKV.get("backupDir");
    const handle = row?.value as DirHandle | undefined;
    if (!handle) return null;
    if (!(await ensurePermission(handle, prompt))) return null;
    return handle;
  } catch {
    return null;
  }
}

async function writeBackupToDir(handle: DirHandle): Promise<boolean> {
  try {
    const obj = await buildBackupObject();
    const fileHandle = await handle.getFileHandle(
      `lifeos-backup-${ymd(new Date())}.json`,
      { create: true },
    );
    const w = await fileHandle.createWritable();
    await w.write(JSON.stringify(obj));
    await w.close();
    setLastBackup();
    return true;
  } catch {
    return false;
  }
}

export async function backupToFolderNow(): Promise<boolean> {
  const h = await getBackupDir(true);
  if (!h) return false;
  return writeBackupToDir(h);
}

/** Called periodically by the bootstrap — silent, no permission prompt. */
export async function maybeAutoBackup(): Promise<void> {
  const last = lastBackupAt();
  if (last && Date.now() - last < 12 * 3_600_000) return;
  const h = await getBackupDir(false);
  if (!h) return;
  await writeBackupToDir(h);
}

// ── last-backup timestamp ──────────────────────────────────────────────────────

export function lastBackupAt(): number | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function setLastBackup(): void {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}
