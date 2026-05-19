"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Shuffle } from "lucide-react";
import type { Item } from "@/db/schema";

/**
 * Spaced-repetition style widget: shows a single old highlight to re-read.
 * Click "another" to cycle through.
 */
export function SrsHighlight({ pool }: { pool: Item[] }) {
  const [idx, setIdx] = useState(0);
  if (pool.length === 0) return null;
  const h = pool[idx % pool.length];
  const ageDays = Math.floor(
    (Date.now() - new Date(h.capturedAt).getTime()) / 86_400_000,
  );

  return (
    <div className="life-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          <Sparkles size={11} className="text-[var(--accent)]" />
          Worth re-reading
        </div>
        {pool.length > 1 && (
          <button
            type="button"
            onClick={() => setIdx((i) => i + 1)}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--accent)] transition"
          >
            <Shuffle size={10} />
            Another
          </button>
        )}
      </div>
      <Link
        href={`/items/${h.id}`}
        className="block rounded-md p-2 -m-2 hover:bg-[var(--bg-card-hover)] transition"
      >
        <blockquote className="text-sm leading-relaxed text-[var(--text)] italic">
          {h.body ?? h.title}
        </blockquote>
        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
          {h.title && h.body && <span>— {h.title}</span>}
          <span className="ml-auto">{ageDays}d ago</span>
        </div>
      </Link>
    </div>
  );
}
