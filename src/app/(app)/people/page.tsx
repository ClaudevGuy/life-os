"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search } from "lucide-react";
import { useItemsOfKind } from "@/lib/store/items";
import { NewPersonButton } from "./new-person";
import { BlobImg } from "@/components/blob-img";
import { EmptyState, PageHeader } from "@/components/empty-state";

export default function PeoplePage() {
  const rows = useItemsOfKind("person") ?? [];
  const [query, setQuery] = useState("");

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;

  const recent = rows.filter((p) => {
    const m = (p.metadata ?? {}) as { lastContactedAt?: string };
    if (!m.lastContactedAt) return false;
    return new Date(m.lastContactedAt).getTime() >= weekAgo;
  }).length;
  const stale = rows.filter((p) => {
    const m = (p.metadata ?? {}) as { lastContactedAt?: string };
    if (!m.lastContactedAt) return true;
    return new Date(m.lastContactedAt).getTime() < monthAgo;
  }).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => {
      const m = (p.metadata ?? {}) as { handle?: string };
      const hay = `${p.title ?? ""}\n${m.handle ?? ""}\n${p.summary ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        icon={Users}
        title="People"
        subtitle="Conversations, last contacted, and what was discussed."
        tint="var(--kind-person)"
        action={<NewPersonButton />}
      />

      {rows.length > 0 && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3 life-stagger">
            <Stat label="Total" value={rows.length} tone="default" />
            <Stat label="In touch (7d)" value={recent} tone="good" />
            <Stat label="Stale (30d+)" value={stale} tone="warn" />
          </div>
          <div className="mt-6 relative max-w-md">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, handle, or note…"
              className="w-full bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-full pl-8 pr-3 py-1.5 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition"
            />
          </div>
        </>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          tint="var(--kind-person)"
          title="Your relationships, remembered."
          body="Add anyone you talk to often — friends, mentors, recruiters, family. Track when you last spoke and what you discussed."
          actions={[{ label: "Add person", onClickKey: "c" }]}
        />
      ) : filtered.length === 0 ? (
        <div className="mt-8 life-card p-10 text-center">
          <Search size={20} className="mx-auto text-[var(--text-faint)]" />
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            No people match “{query}”.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 life-stagger">
          {filtered.map((p) => {
            const meta = (p.metadata ?? {}) as {
              handle?: string;
              lastContactedAt?: string;
              photos?: string[];
            };
            const avatar = meta.photos?.[0];
            const initials = (p.title ?? "?")
              .split(" ")
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const last = meta.lastContactedAt
              ? new Date(meta.lastContactedAt)
              : null;
            const staleNow = !last || last.getTime() < monthAgo;
            return (
              <li
                key={p.id}
                className="life-card life-card-hover transition relative overflow-hidden"
              >
                <Link href={`/items/${p.id}`} className="flex gap-3 p-3.5">
                  {avatar ? (
                    <BlobImg
                      id={avatar}
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-[var(--border-soft)]"
                    />
                  ) : (
                    <div
                      className="grid place-items-center w-11 h-11 rounded-full shrink-0 text-[11px] font-semibold border border-[var(--border-soft)]"
                      style={{
                        background: `color-mix(in oklch, var(--kind-person) 14%, var(--bg-card))`,
                        color: "var(--kind-person)",
                      }}
                    >
                      {initials || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-medium truncate">
                        {p.title ?? "untitled"}
                      </div>
                      {meta.handle && (
                        <div className="text-xs text-[var(--text-faint)] truncate">
                          {meta.handle}
                        </div>
                      )}
                    </div>
                    {p.summary && (
                      <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {p.summary}
                      </p>
                    )}
                    <div className="mt-1.5 text-[11px] inline-flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: staleNow ? "#ef8b8b" : "#6dc8a1",
                        }}
                      />
                      <span
                        className={
                          staleNow
                            ? "text-[var(--text-faint)]"
                            : "text-[var(--text-muted)]"
                        }
                      >
                        {last ? `last spoke ${formatRel(last)}` : "no contact logged"}
                      </span>
                    </div>
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "good" | "warn";
}) {
  const colorClass =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-[#ef8b8b]"
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

function formatRel(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
