"use client";

import { useEffect } from "react";
import { isSyncConfigured } from "@/lib/sync/state";
import { syncNow, pullOnly } from "@/lib/sync/gist";

const POLL_INTERVAL_MS = 60_000; // pull every minute while the tab is visible

/**
 * Mounted once at the app root. Handles the pull side of sync — initial
 * round-trip on mount, then a quiet poll while the tab is visible. The push
 * side is driven by store mutations (schedulePushIfConfigured), so we don't
 * need Dexie write hooks here (those interact badly with
 * dexie-react-hooks' internal cache).
 */
export function SyncBootstrap() {
  useEffect(() => {
    if (!isSyncConfigured()) return;

    let cancelled = false;

    async function safe(fn: () => Promise<unknown>) {
      try {
        await fn();
      } catch {
        /* swallowed — surfaced via lastSyncError in state */
      }
    }

    // Initial sync on mount (pull + push).
    void safe(syncNow);

    // Pull on tab focus and on a 60s timer while visible.
    const onFocus = () => {
      if (!cancelled && document.visibilityState === "visible") {
        void safe(pullOnly);
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    const pollTimer = setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") {
        void safe(pullOnly);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return null;
}
