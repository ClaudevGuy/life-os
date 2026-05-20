"use client";

import { useEffect } from "react";
import { autoRequestPersistOnce } from "@/lib/persist";
import { db } from "@/lib/store/db";

const REMOVED_KINDS_MIGRATION_KEY = "lifeos.migration.removeBookmarksIdeas";

async function purgeRemovedKinds() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(REMOVED_KINDS_MIGRATION_KEY) === "done") return;
  try {
    await db.items.where("kind").anyOf("bookmark", "idea").delete();
    localStorage.setItem(REMOVED_KINDS_MIGRATION_KEY, "done");
  } catch {
    // best-effort; will retry on next load
  }
}

/**
 * Mounted once at the app root. Silently asks the browser to mark our
 * IndexedDB as persistent on first visit so the data can't be evicted
 * under storage pressure. Idempotent and gated by localStorage — won't
 * re-prompt the user on every page load.
 *
 * Also runs a one-time purge of legacy `bookmark` / `idea` rows that
 * existed before those kinds were removed from the app.
 */
export function PersistBootstrap() {
  useEffect(() => {
    void autoRequestPersistOnce();
    void purgeRemovedKinds();
  }, []);
  return null;
}
