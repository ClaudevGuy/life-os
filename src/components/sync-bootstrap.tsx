"use client";

import { useEffect } from "react";
import { db } from "@/lib/store/db";
import { isSyncConfigured } from "@/lib/sync/state";
import { syncNow, pullOnly } from "@/lib/sync/gist";

const POLL_INTERVAL_MS = 60_000; // pull every minute while the tab is visible
const PUSH_DEBOUNCE_MS = 5_000; // push 5s after the last local write

/**
 * Mounted once at the app root. If gist sync is configured, runs a quiet
 * background loop: pull on focus + every minute, push after writes settle.
 */
export function SyncBootstrap() {
  useEffect(() => {
    if (!isSyncConfigured()) return;

    let cancelled = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastSeenMaxUpdated = 0;

    async function safeSync(fn: () => Promise<unknown>) {
      try {
        await fn();
      } catch {
        /* swallowed — surfaced via lastSyncError in state */
      }
    }

    function schedulePush() {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        if (cancelled) return;
        void safeSync(syncNow);
      }, PUSH_DEBOUNCE_MS);
    }

    async function checkForLocalChanges() {
      if (cancelled) return;
      // Cheapest possible "did anything change?" probe: max updatedAt over the
      // items table. If it's newer than what we last saw, schedule a push.
      const top = await db.items.orderBy("capturedAt").reverse().first();
      const allItems = await db.items.toArray();
      let maxUpdated = top ? top.updatedAt.getTime() : 0;
      for (const i of allItems) {
        const t = i.updatedAt.getTime();
        if (t > maxUpdated) maxUpdated = t;
      }
      if (lastSeenMaxUpdated === 0) {
        // Seed on first tick so we don't push the entire snapshot just because
        // we mounted (syncNow on mount already handled that).
        lastSeenMaxUpdated = maxUpdated;
        return;
      }
      if (maxUpdated > lastSeenMaxUpdated) {
        lastSeenMaxUpdated = maxUpdated;
        schedulePush();
      }
    }

    // Initial sync on mount.
    void safeSync(syncNow);

    // Watch IndexedDB for changes via Dexie's table hooks. Each hook fires
    // once per write — no debounce here; the push timer handles batching.
    const onAnyWrite = () => schedulePush();
    db.items.hook("creating", onAnyWrite);
    db.items.hook("updating", onAnyWrite);
    db.items.hook("deleting", onAnyWrite);

    // Pull on tab focus + every minute while visible.
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void safeSync(pullOnly);
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void safeSync(pullOnly);
        void checkForLocalChanges();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pushTimer) clearTimeout(pushTimer);
      if (pollTimer) clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onFocus);
      db.items.hook("creating").unsubscribe(onAnyWrite);
      db.items.hook("updating").unsubscribe(onAnyWrite);
      db.items.hook("deleting").unsubscribe(onAnyWrite);
    };
  }, []);

  return null;
}
