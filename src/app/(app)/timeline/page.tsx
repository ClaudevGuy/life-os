"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { useAllItems, type StoredItem } from "@/lib/store/items";
import { EmptyState, PageHeader } from "@/components/empty-state";

type KindFilter = "all" | StoredItem["kind"];

export default function TimelinePage() {
  const rows = useAllItems() ?? [];
  const [filter, setFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.kind !== filter) return false;
      if (q) {
        const hay = `${r.title ?? ""}\n${r.body ?? ""}\n${r.summary ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, query]);

  const byDay = useMemo(() => {
    const map = new Map<string, StoredItem[]>();
    for (const r of filtered) {
      const key = new Date(r.capturedAt).toISOString().slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.entries()].map(([date, items]) => ({ date, items }));
  }, [filtered]);

  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
    return counts;
  }, [rows]);

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const captured7 = rows.filter(
    (r) => new Date(r.capturedAt).getTime() >= weekAgo,
  ).length;
  const today = new Date().toISOString().slice(0, 10);
  const capturedToday = rows.filter(
    (r) => new Date(r.capturedAt).toISOString().slice(0, 10) === today,
  ).length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        icon={Clock}
        title="Timeline"
        subtitle="Everything you've captured, in order."
        tint="var(--accent)"
      />

      {rows.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3 life-stagger">
            <Stat label="Total" value={rows.length} tone="default" />
            <Stat label="This week" value={captured7} tone="accent" />
            <Stat label="Today" value={capturedToday} tone="good" />
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
                placeholder="Search timeline…"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-full pl-8 pr-3 py-1.5 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <KindChip
              kind="all"
              label="All"
              count={rows.length}
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            {[...kindCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, count]) => (
                <KindChip
                  key={k}
                  kind={k as StoredItem["kind"]}
                  label={k}
                  count={count}
                  active={filter === k}
                  onClick={() =>
                    setFilter((filter === k ? "all" : k) as KindFilter)
                  }
                />
              ))}
          </div>
        </>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Clock}
          tint="var(--accent)"
          title="Your timeline begins with one capture."
          body="Everything you save lands here in chronological order — a single thread across notes, tasks, decisions, journal entries, and more."
          actions={[{ label: "Capture", onClickKey: "c" }]}
        />
      ) : byDay.length === 0 ? (
        <div className="mt-8 life-card p-10 text-center">
          <Search size={20} className="mx-auto text-[var(--text-faint)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Nothing matches the current filters.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {byDay.map(({ date, items }) => (
            <DaySection key={date} date={date} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function DaySection({ date, items }: { date: string; items: StoredItem[] }) {
  return (
    <section>
      <h2 className="inline-flex items-baseline gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 font-medium">
        <span className="text-[var(--text-muted)] font-semibold tracking-[0.18em]">
          {formatDay(date)}
        </span>
        <span className="text-[var(--text-faint)] font-mono">·</span>
        <span className="tabular-nums">{items.length}</span>
      </h2>
      <ul className="relative space-y-1.5 pl-6">
        <span
          aria-hidden
          className="absolute left-[7px] top-1 bottom-1 w-px bg-[var(--border-soft)]"
        />
        {items.map((it) => (
          <TimelineRow key={it.id} item={it} />
        ))}
      </ul>
    </section>
  );
}

function TimelineRow({ item }: { item: StoredItem }) {
  const tint = `var(--kind-${item.kind})`;
  const time = new Date(item.capturedAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <li className="relative">
      <span
        aria-hidden
        className="absolute -left-[1.32rem] top-3 w-2 h-2 rounded-full ring-2 ring-[var(--bg-app)]"
        style={{ background: tint, boxShadow: `0 0 6px ${tint}80` }}
      />
      <Link
        href={`/items/${item.id}`}
        className="block py-2 px-3 -mx-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition group"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-medium"
            style={{ color: tint }}
          >
            {item.kind}
          </span>
          <span className="text-sm text-[var(--text)] truncate flex-1 min-w-0">
            {item.title ?? (
              <em className="text-[var(--text-faint)]">untitled</em>
            )}
          </span>
          <span className="text-[10px] text-[var(--text-faint)] font-mono tabular-nums shrink-0 opacity-0 group-hover:opacity-100 transition">
            {time}
          </span>
        </div>
        {item.summary && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
            {item.summary}
          </p>
        )}
      </Link>
    </li>
  );
}

function KindChip({
  kind,
  label,
  count,
  active,
  onClick,
}: {
  kind: KindFilter;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const tint = kind === "all" ? "var(--accent)" : `var(--kind-${kind})`;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${
        active
          ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent)]"
          : "bg-[var(--bg-card)] border-[var(--border-soft)] text-[var(--text-muted)] hover:border-[var(--border-strong)]"
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: tint }}
      />
      {label}
      <span className="tabular-nums text-[var(--text-faint)] font-mono">
        {count}
      </span>
    </button>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "accent" | "good";
}) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
      ? "text-emerald-300"
      : "text-[var(--text)]";
  return (
    <div className="life-card p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date().toISOString().slice(0, 10);
  if (iso === today) return "Today";
  const ytd = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === ytd) return "Yesterday";
  const diff = Math.floor(
    (Date.now() - d.getTime()) / 86_400_000,
  );
  if (diff < 7) {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
