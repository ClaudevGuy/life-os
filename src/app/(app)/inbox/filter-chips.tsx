"use client";

import { useState } from "react";

type Kind = "all" | "note" | "task" | "highlight";

const TABS: Array<{ k: Kind; label: string }> = [
  { k: "all", label: "All" },
  { k: "note", label: "Notes" },
  { k: "task", label: "Tasks" },
  { k: "highlight", label: "Highlights" },
];

export function FilterChips({
  onChange,
  initial = "all",
}: {
  onChange: (k: Kind) => void;
  initial?: Kind;
}) {
  const [active, setActive] = useState<Kind>(initial);

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {TABS.map((t) => (
        <button
          key={t.k}
          type="button"
          onClick={() => {
            setActive(t.k);
            onChange(t.k);
          }}
          className={`rounded-full px-3 py-1 text-xs whitespace-nowrap transition ${
            active === t.k
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
