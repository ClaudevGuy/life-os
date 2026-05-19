/**
 * Browser persistent-storage helpers. When persistent storage is granted, the
 * browser promises NOT to evict our IndexedDB under quota pressure — the user
 * has to explicitly clear site data to lose anything.
 *
 * See: https://developer.mozilla.org/en-US/docs/Web/API/StorageManager
 */
"use client";

const ATTEMPTED_KEY = "lifeos.persist.attempted";

export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return false;
  }
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/** Ask the browser to mark our origin as persistent. Idempotent. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget version that only attempts once per browser profile.
 * Some browsers auto-grant based on engagement heuristics (bookmarked,
 * frequent visits, granted notifications). Others prompt. If denied, we
 * remember and don't keep asking on every refresh — the user can re-trigger
 * from /settings → Data.
 */
export async function autoRequestPersistOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (await isStoragePersisted()) return;
  try {
    if (localStorage.getItem(ATTEMPTED_KEY)) return;
  } catch {
    /* storage disabled */
  }
  try {
    await requestPersistentStorage();
  } finally {
    try {
      localStorage.setItem(ATTEMPTED_KEY, "1");
    } catch {
      /* ignore */
    }
  }
}

export type StorageEstimate = { usage: number; quota: number };

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
