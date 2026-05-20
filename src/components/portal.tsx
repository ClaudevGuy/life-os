"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Render children directly on document.body — escapes any ancestor that
 * creates a containing block for position:fixed (transforms, filters,
 * backdrop-filter, contain, etc.). Use for modals and overlays so the
 * backdrop reliably covers the entire viewport.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
