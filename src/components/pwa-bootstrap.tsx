"use client";

import { useEffect } from "react";
import { db } from "@/lib/store/db";
import { fireDue, notifyEnabled } from "@/lib/notify";
import { maybeAutoBackup } from "@/lib/backup";

/**
 * Registers the service worker (offline + notifications) and runs the local
 * notification scheduler while the app is open.
 */
export function PwaBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (stopped || !notifyEnabled()) return;
      try {
        const items = await db.items.toArray();
        await fireDue(items);
      } catch {
        /* ignore */
      }
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  // Auto-backup to the connected folder (silent; ~every 12h, checked every 30m).
  useEffect(() => {
    const run = () => {
      void maybeAutoBackup();
    };
    const t = setTimeout(run, 8_000); // shortly after load
    const id = setInterval(run, 30 * 60_000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  return null;
}
