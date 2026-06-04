"use client";

import { Search } from "lucide-react";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true }),
        )
      }
      className="group w-full max-w-[720px] flex items-center gap-2.5 text-[13.5px] text-[var(--muted)] px-[14px] py-[9px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--terra)] hover:text-[var(--ink)] hover:shadow-[0_1px_8px_var(--accent-glow)] transition"
    >
      <Search
        size={15}
        strokeWidth={1.8}
        className="text-[var(--muted-2)] group-hover:text-[var(--terra)] transition-colors shrink-0"
      />
      <span className="truncate">Search everything…</span>
      <kbd className="ml-auto text-[10.5px] font-mono tracking-[0.04em] text-[var(--muted-2)] px-1.5 py-[2px] border border-[var(--line)] rounded-[5px] group-hover:border-[var(--terra)]/40 transition-colors">
        ⌘K
      </kbd>
    </button>
  );
}
