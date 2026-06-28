"use client";

/**
 * Registers the messaging channel adapters in the browser and re-syncs any
 * already-connected accounts on load. The channel modules are dynamically
 * imported (never on the server) because Google Identity Services touches
 * window at load.
 */
import { useEffect } from "react";
import { db } from "@/lib/store/db";
import {
  registerAdapter,
  refreshChannel,
  purgeRemovedChannels,
} from "@/lib/store/messaging";

export function MessagingBootstrap() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const gm = await import("@/lib/messaging/gmail");
        if (cancelled) return;
        registerAdapter(gm.gmailAdapter);

        // Clean up any data left behind by removed channels (e.g. Telegram).
        await purgeRemovedChannels();
        if (cancelled) return;

        // Best-effort refresh of connected accounts so the inbox is current.
        const accounts = await db.msgAccounts.toArray();
        for (const a of accounts) {
          if (a.status !== "connected") continue;
          refreshChannel(a.id, a.channel).catch(() => {});
        }
      } catch (e) {
        console.error("messaging bootstrap failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
