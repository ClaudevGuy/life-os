/**
 * Sync configuration state — the user's GitHub PAT, the gist ID, and the
 * timestamps for the last successful push/pull. Lives in localStorage so it
 * persists across sessions but never leaves the browser.
 */
"use client";

const KEY = {
  token: "lifeos.sync.token",
  gistId: "lifeos.sync.gistId",
  lastPushedAt: "lifeos.sync.lastPushedAt",
  lastPulledAt: "lifeos.sync.lastPulledAt",
  lastError: "lifeos.sync.lastError",
} as const;

function get(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getSyncToken(): string | null {
  return get(KEY.token);
}
export function setSyncToken(token: string | null): void {
  set(KEY.token, token?.trim() || null);
}

export function getSyncGistId(): string | null {
  return get(KEY.gistId);
}
export function setSyncGistId(id: string | null): void {
  set(KEY.gistId, id);
}

export function getLastPushedAt(): Date | null {
  const v = get(KEY.lastPushedAt);
  return v ? new Date(v) : null;
}
export function setLastPushedAt(d: Date | null): void {
  set(KEY.lastPushedAt, d?.toISOString() ?? null);
}

export function getLastPulledAt(): Date | null {
  const v = get(KEY.lastPulledAt);
  return v ? new Date(v) : null;
}
export function setLastPulledAt(d: Date | null): void {
  set(KEY.lastPulledAt, d?.toISOString() ?? null);
}

export function getLastSyncError(): string | null {
  return get(KEY.lastError);
}
export function setLastSyncError(msg: string | null): void {
  set(KEY.lastError, msg);
}

export function disconnectSync(): void {
  setSyncToken(null);
  setSyncGistId(null);
  setLastPushedAt(null);
  setLastPulledAt(null);
  setLastSyncError(null);
}

export function isSyncConfigured(): boolean {
  return !!getSyncToken();
}
