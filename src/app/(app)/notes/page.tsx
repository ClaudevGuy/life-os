"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NotebookPen, Pin, Search, Hash, FileText } from "lucide-react";
import { useItemsOfKind, type StoredItem } from "@/lib/store/items";
import { NewNote } from "./new-note";
import { QuickNote } from "./quick-note";

type Filter = "all" | "pinned" | "week" | "month";

export default function NotesPage() {
  const rows = useItemsOfKind("note") ?? [];
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(null);

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;

  const counts = useMemo(() => {
    let pinned = 0;
    let week = 0;
    let month = 0;
    for (const r of rows) {
      if (r.isPinned) pinned++;
      const ts = new Date(r.updatedAt).getTime();
      if (ts >= weekAgo) week++;
      if (ts >= monthAgo) month++;
    }
    return { total: rows.length, pinned, week, month };
  }, [rows, weekAgo, monthAgo]);

  const topics = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.topic) map.set(r.topic, (map.get(r.topic) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "pinned" && !r.isPinned) return false;
      if (filter === "week" && new Date(r.updatedAt).getTime() < weekAgo) return false;
      if (filter === "month" && new Date(r.updatedAt).getTime() < monthAgo) return false;
      if (topic && r.topic !== topic) return false;
      if (q) {
        const hay = `${r.title ?? ""}\n${r.body ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, query, topic, weekAgo, monthAgo]);

  const pinnedRows = filter === "all" ? filtered.filter((r) => r.isPinned) : [];
  const otherRows = filter === "all" ? filtered.filter((r) => !r.isPinned) : filtered;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <NotebookPen size={18} className="text-[var(--accent)]" />
            Notes
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Thoughts, conversation logs, scraps you want to keep.
          </p>
        </div>
        <NewNote />
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger">
        <Stat
          label="Total"
          value={counts.total}
          tone="default"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <Stat
          label="Pinned"
          value={counts.pinned}
          tone="accent"
          active={filter === "pinned"}
          onClick={() => setFilter("pinned")}
        />
        <Stat
          label="This week"
          value={counts.week}
          tone="good"
          active={filter === "week"}
          onClick={() => setFilter("week")}
        />
        <Stat
          label="This month"
          value={counts.month}
          tone="default"
          active={filter === "month"}
          onClick={() => setFilter("month")}
        />
      </div>

      <div className="mt-4">
        <QuickNote />
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-full pl-8 pr-3 py-1.5 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition"
          />
        </div>
        {topics.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTopic(null)}
              className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${
                topic === null
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] hover:border-[var(--border-strong)]"
              }`}
            >
              All topics
            </button>
            {topics.slice(0, 8).map(([t, count]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t === topic ? null : t)}
                className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition ${
                  topic === t
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] hover:border-[var(--border-strong)]"
                }`}
              >
                <Hash size={10} />
                {t}
                <span className="text-[var(--text-faint)] tabular-nums">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(query || topic || filter !== "all")} />
      ) : (
        <>
          {pinnedRows.length > 0 && (
            <section className="mt-8 life-rise">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-2">
                <Pin size={10} className="text-[var(--accent)] fill-[var(--accent)]" />
                Pinned
                <span className="text-[var(--text-faint)] font-mono">·</span>
                <span className="tabular-nums">{pinnedRows.length}</span>
              </h2>
              <NoteGrid rows={pinnedRows} />
            </section>
          )}

          <section className="mt-8 life-rise" style={{ animationDelay: "120ms" }}>
            {pinnedRows.length > 0 && (
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
                All notes
                <span className="text-[var(--text-faint)] font-mono mx-2">·</span>
                <span className="tabular-nums">{otherRows.length}</span>
              </h2>
            )}
            <NoteGrid rows={otherRows} />
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "default" | "accent" | "good";
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
      ? "text-emerald-300"
      : "text-[var(--text)]";
  const accentColor =
    tone === "accent"
      ? "var(--accent)"
      : tone === "good"
      ? "#6dc8a1"
      : "var(--text-muted)";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`life-card p-3.5 text-left transition relative overflow-hidden ${
        active
          ? "border-[var(--border-strong)] bg-[var(--bg-card-hover)]"
          : "hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
      )}
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </button>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  if (hasQuery) {
    return (
      <div className="mt-12 life-card p-10 text-center">
        <Search size={20} className="mx-auto text-[var(--text-faint)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">No matching notes.</p>
        <p className="mt-1 text-xs text-[var(--text-faint)]">
          Try a different filter or clear the search.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-12 relative overflow-hidden life-card p-12 text-center">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, var(--accent-glow), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="mx-auto grid place-items-center w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <FileText size={22} />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-tight life-shine">
          Your first note is one keystroke away
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-sm mx-auto">
          Capture a thought, paste a conversation, sketch an idea. Markdown is welcome
          and <code className="text-[var(--accent)]">[[wiki links]]</code> connect them.
        </p>
        <div className="mt-5 inline-flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
          <kbd className="rounded bg-[var(--bg-rail)] border border-[var(--border-soft)] px-1.5 py-0.5">
            c
          </kbd>
          <span>anywhere to quick-capture</span>
        </div>
      </div>
    </div>
  );
}

function NoteGrid({ rows }: { rows: StoredItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
      {rows.map((n) => (
        <NoteCard key={n.id} note={n} />
      ))}
    </div>
  );
}

function NoteCard({ note: n }: { note: StoredItem }) {
  const accent = topicColor(n.topic);
  return (
    <Link
      href={`/items/${n.id}`}
      className="group life-card life-card-hover p-4 transition flex flex-col min-h-[160px] relative overflow-hidden"
      style={
        n.isPinned
          ? {
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px color-mix(in oklab, var(--accent) 22%, transparent)",
            }
          : undefined
      }
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r opacity-50 group-hover:opacity-90 transition"
        style={{ background: accent }}
      />
      <div className="flex items-start gap-2 pl-2">
        <span className="text-[13.5px] font-medium text-[var(--text)] line-clamp-2 flex-1 leading-snug">
          {n.title ?? "Untitled"}
        </span>
        {n.isPinned && (
          <Pin
            size={11}
            className="mt-1 shrink-0 text-[var(--accent)] fill-[var(--accent)]"
          />
        )}
      </div>
      {n.body && (
        <p className="mt-2 pl-2 text-[12px] text-[var(--text-muted)] line-clamp-5 leading-relaxed">
          {n.body}
        </p>
      )}
      <div className="mt-auto pt-3 pl-2 flex items-center gap-2 text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
        {n.topic && (
          <span
            className="inline-flex items-center gap-1"
            style={{ color: accent }}
          >
            <Hash size={9} />
            {n.topic}
          </span>
        )}
        <span className="ml-auto">{relDate(n.updatedAt)}</span>
      </div>
    </Link>
  );
}

function topicColor(topic: string | null | undefined): string {
  if (!topic) return "var(--text-faint)";
  const palette = [
    "#d4a866",
    "#6dc8a1",
    "#6aa9ef",
    "#e57f9f",
    "#c79bff",
    "#f1c27d",
    "#7fb3ad",
    "#ef8b8b",
  ];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash << 5) - hash + topic.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function relDate(d: Date) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
