"use client";

import { useEffect } from "react";
import { autoRequestPersistOnce } from "@/lib/persist";

/**
 * Mounted once at the app root. Silently asks the browser to mark our
 * IndexedDB as persistent on first visit so the data can't be evicted
 * under storage pressure. Idempotent and gated by localStorage — won't
 * re-prompt the user on every page load.
 */
export function PersistBootstrap() {
  useEffect(() => {
    void autoRequestPersistOnce();
  }, []);
  return null;
}
