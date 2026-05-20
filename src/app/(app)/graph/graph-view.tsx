"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter, Link as LinkIcon } from "lucide-react";

export type GraphItem = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  topic: string | null;
  body: string | null;
};

const KIND_ORDER = [
  "note",
  "task",
  "decision",
  "person",
  "journal",
  "highlight",
  "habit",
  "goal",
  "project",
  "file",
] as const;

export function GraphView({ items }: { items: GraphItem[] }) {
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // ----- compute topics, connections, search -----

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (kindFilter && i.kind !== kindFilter) return false;
      if (!needle) return true;
      const hay = [i.title, i.summary, i.topic].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, kindFilter]);

  const topics = useMemo(() => {
    const m = new Map<string, GraphItem[]>();
    for (const i of filtered) {
      if (!i.topic) continue;
      const arr = m.get(i.topic) ?? [];
      arr.push(i);
      m.set(i.topic, arr);
    }
    return [...m.entries()]
      .map(([topic, list]) => ({ topic, list }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [filtered]);

  const kindCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of items) c.set(i.kind, (c.get(i.kind) ?? 0) + 1);
    return c;
  }, [items]);

  // Parse [[wiki links]] across all items, resolve by title → build edges
  const titleToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of items)
      if (i.title) m.set(i.title.toLowerCase(), i.id);
    return m;
  }, [items]);

  const links = useMemo(() => {
    type Edge = { from: GraphItem; to: GraphItem };
    const out: Edge[] = [];
    const re = /\[\[([^\]]+)\]\]/g;
    for (const i of items) {
      if (!i.body) continue;
      let m: RegExpExecArray | null;
      while ((m = re.exec(i.body))) {
        const targetId = titleToId.get(m[1].trim().toLowerCase());
        if (!targetId || targetId === i.id) continue;
        const target = items.find((x) => x.id === targetId);
        if (target) out.push({ from: i, to: target });
      }
    }
    return out;
  }, [items, titleToId]);

  const topLinked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of links) {
      counts.set(e.to.id, (counts.get(e.to.id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, n]) => ({ item: items.find((i) => i.id === id)!, n }))
      .filter((x) => x.item)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }, [links, items]);

  const maxTopicSize = topics[0]?.list.length ?? 1;

  // Topic detail
  const topicItems = selectedTopic
    ? topics.find((t) => t.topic === selectedTopic)?.list ?? []
    : null;

  return (
    <div className="mt-6">
      {/* Top bar: search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0 inline-flex items-center gap-2 life-card px-3 py-1.5">
          <Search size={13} className="text-[var(--text-faint)] shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items, topics…"
            className="flex-1 bg-transparent text-sm placeholder:text-[var(--text-faint)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <KindBtn
            label="All"
            count={items.length}
            active={kindFilter === null}
            onClick={() => setKindFilter(null)}
          />
          {KIND_ORDER.map((k) => {
            const n = kindCounts.get(k) ?? 0;
            if (n === 0) return null;
            return (
              <KindBtn
                key={k}
                label={k}
                count={n}
                active={kindFilter === k}
                color={`var(--kind-${k})`}
                onClick={() => setKindFilter(kindFilter === k ? null : k)}
              />
            );
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
        <Stat label="Items" value={filtered.length} />
        <Stat label="Topics" value={topics.length} />
        <Stat label="Connections" value={links.length} />
        <Stat label="Density" value={`${avgConn(links.length, filtered.length)}`} />
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Topic bar list */}
        <div className="life-card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Topics · click to drill in
            </h2>
            <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
              {topics.length} topic{topics.length === 1 ? "" : "s"}
            </span>
          </div>
          {topics.length === 0 ? (
            <p className="text-sm text-[var(--text-faint)]">
              No matches. Try clearing the filters.
            </p>
          ) : (
            <ul className="space-y-1">
              {topics.map((t) => {
                const active = selectedTopic === t.topic;
                const pct = (t.list.length / maxTopicSize) * 100;
                // Mix of kinds inside this topic for the bar gradient
                const kindMix = new Map<string, number>();
                for (const i of t.list) {
                  kindMix.set(i.kind, (kindMix.get(i.kind) ?? 0) + 1);
                }
                const dominantKind = [...kindMix.entries()].sort(
                  (a, b) => b[1] - a[1],
                )[0]?.[0];
                return (
                  <li key={t.topic}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTopic(active ? null : t.topic)
                      }
                      className={`group w-full flex items-center gap-3 rounded-md px-2.5 py-2 transition ${
                        active
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--bg-card-hover)]"
                      }`}
                    >
                      <span
                        className={`text-sm tabular-nums truncate text-left min-w-0 flex-1 ${
                          active ? "text-[var(--accent)] font-medium" : "text-[var(--text)]"
                        }`}
                      >
                        #{t.topic}
                      </span>
                      <div className="flex-1 max-w-[60%] h-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: dominantKind
                              ? `var(--kind-${dominantKind})`
                              : "var(--accent)",
                          }}
                        />
                      </div>
                      <span
                        className={`w-8 text-right text-xs tabular-nums shrink-0 ${
                          active ? "text-[var(--accent)]" : "text-[var(--text-faint)]"
                        }`}
                      >
                        {t.list.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Side panel — either selected topic or top-linked */}
        <div className="life-card p-5">
          {topicItems ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  <span className="text-[var(--accent)]">#{selectedTopic}</span>{" "}
                  <span className="text-[var(--text-faint)] tabular-nums">
                    · {topicItems.length}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text)]"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-1">
                {topicItems.map((it) => (
                  <li key={it.id}>
                    <Link
                      href={`/items/${it.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm hover:bg-[var(--bg-card-hover)] transition"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: `var(--kind-${it.kind})` }}
                      />
                      <span className="text-[var(--text)] truncate">
                        {it.title ?? "untitled"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3 className="inline-flex items-center gap-1.5 text-sm font-medium mb-3">
                <LinkIcon size={12} className="text-[var(--accent)]" />
                Most linked
              </h3>
              {topLinked.length === 0 ? (
                <p className="text-sm text-[var(--text-faint)]">
                  Use <span className="font-mono text-[12px] text-[var(--accent)]">[[wiki links]]</span> inside note bodies to see what gets referenced most.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {topLinked.map(({ item, n }) => (
                    <li key={item.id}>
                      <Link
                        href={`/items/${item.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 text-sm hover:bg-[var(--bg-card-hover)] transition"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: `var(--kind-${item.kind})` }}
                        />
                        <span className="flex-1 truncate text-[var(--text)]">
                          {item.title ?? "untitled"}
                        </span>
                        <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
                          {n} ref{n === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KindBtn({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} · ${count}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap transition ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border-soft)] hover:border-[var(--border-strong)]"
      }`}
    >
      {color && (
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: color }}
        />
      )}
      <span className="capitalize">{label}</span>
      <span
        className={`tabular-nums ${
          active ? "text-[var(--accent)]/70" : "text-[var(--text-faint)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="life-card p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-[var(--text)]">
        {value}
      </div>
    </div>
  );
}

function avgConn(edges: number, nodes: number): string {
  if (nodes === 0) return "0";
  return (edges / nodes).toFixed(2);
}
