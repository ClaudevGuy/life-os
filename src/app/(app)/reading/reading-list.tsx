"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pin, BookOpen, BookCheck, Bookmark } from "lucide-react";
import type { StoredItem as Item } from "@/lib/store/items";
import { BlobImg } from "@/components/blob-img";

type State = "all" | "to-read" | "reading" | "finished";

const TABS: Array<{ key: State; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { key: "all", label: "All", icon: Bookmark },
  { key: "to-read", label: "To read", icon: Bookmark },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "finished", label: "Finished", icon: BookCheck },
];

function getState(it: Item): "to-read" | "reading" | "finished" {
  const s = ((it.metadata ?? {}) as { readState?: string }).readState;
  if (s === "reading" || s === "finished") return s;
  return "to-read";
}

export function ReadingList({ rows }: { rows: Item[] }) {
  const [tab, setTab] = useState<State>("all");

  const counts = {
    all: rows.length,
    "to-read": rows.filter((r) => getState(r) === "to-read").length,
    reading: rows.filter((r) => getState(r) === "reading").length,
    finished: rows.filter((r) => getState(r) === "finished").length,
  };

  const filtered = tab === "all" ? rows : rows.filter((r) => getState(r) === tab);

  // Pinned first; then by capturedAt desc
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
  });

  return (
    <div className="mt-6">
      <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-soft)] p-0.5 inline-flex">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <Icon size={11} />
              {t.label}
              <span
                className={`tabular-nums text-[10px] ${
                  active ? "text-[var(--accent)]/70" : "text-[var(--text-faint)]"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-8 life-card p-8 text-center text-sm text-[var(--text-faint)]">
          {tab === "to-read"
            ? "Nothing waiting to be read. Save a URL with c → bookmark."
            : tab === "reading"
            ? "Nothing in progress."
            : tab === "finished"
            ? "Nothing finished yet."
            : "No bookmarks yet."}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 life-stagger">
          {sorted.map((it) => {
            const meta = (it.metadata ?? {}) as { photos?: string[]; readState?: string };
            const firstPhoto = meta.photos?.[0];
            const state = getState(it);
            const stateLabel =
              state === "to-read" ? "To read" : state === "reading" ? "Reading" : "Finished";
            return (
              <li key={it.id}>
                <Link
                  href={`/items/${it.id}`}
                  className="life-card life-card-hover block transition overflow-hidden"
                >
                  {firstPhoto && (
                    <BlobImg
                      id={firstPhoto}
                      className="w-full h-32 object-cover border-b border-[var(--border-soft)]"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide">
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          background:
                            state === "finished"
                              ? "color-mix(in oklch, #6dc8a1 18%, transparent)"
                              : state === "reading"
                              ? "var(--accent-soft)"
                              : "var(--bg-card-hover)",
                          color:
                            state === "finished"
                              ? "#6dc8a1"
                              : state === "reading"
                              ? "var(--accent)"
                              : "var(--text-faint)",
                        }}
                      >
                        {stateLabel}
                      </span>
                      {it.estMinutes != null && (
                        <span className="text-[var(--text-faint)] tracking-normal normal-case">
                          {it.estMinutes} min
                        </span>
                      )}
                      {it.isPinned && (
                        <Pin
                          size={10}
                          className="ml-auto text-[var(--accent)] fill-[var(--accent)]"
                        />
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-[var(--text)] leading-snug line-clamp-2">
                      {it.title ?? "untitled"}
                    </h3>
                    {it.summary && (
                      <p className="mt-1.5 text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                        {it.summary}
                      </p>
                    )}
                    {it.sourceUrl && (
                      <div className="mt-3 inline-flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
                        <ExternalLink size={10} />
                        {new URL(it.sourceUrl).hostname.replace(/^www\./, "")}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
