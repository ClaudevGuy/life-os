"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Shuffle } from "lucide-react";
import type { StoredItem as Item } from "@/lib/store/items";

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

  const tint = "var(--kind-voice)";
  return (
    <div className="life-card p-4 relative overflow-hidden">
      <div
        className="absolute -top-px left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
      />
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          <Sparkles size={11} style={{ color: tint }} />
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
