"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Sparkles } from "lucide-react";
import { NewHighlight } from "./new-highlight";
import { BlobImg } from "@/components/blob-img";

export default function HighlightsPage() {
  const rows = useItemsOfKind("highlight") ?? [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent)]" />
            Highlights
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Lines worth re-reading.
          </p>
        </div>
        <NewHighlight />
      </div>

      <ul className="mt-8 space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-[var(--text-faint)]">
            Capture a highlight by selecting text and saving with kind=highlight.
          </p>
        )}
        {rows.map((h) => {
          const m = (h.metadata ?? {}) as { photos?: string[] };
          const firstPhoto = m.photos?.[0];
          return (
            <li key={h.id} className="life-card overflow-hidden">
              {firstPhoto && (
                <BlobImg
                  id={firstPhoto}
                  className="w-full max-h-48 object-cover border-b border-[var(--border-soft)]"
                />
              )}
              <div className="p-5">
                <blockquote className="text-base text-[var(--text)] leading-relaxed">
                  {h.body ?? h.title}
                </blockquote>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-faint)]">
                  {h.title && <span className="italic">— {h.title}</span>}
                  {h.topic && <span>· #{h.topic}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
