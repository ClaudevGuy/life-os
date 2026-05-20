"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { StoredItem } from "@/lib/store/items";
import { FolderKanban, Compass, Calendar, Clock } from "lucide-react";
import { NewProject } from "./new-project";

type ProjectStatus = "active" | "shipping" | "paused";

const STUDIO_PALETTE = [
  "var(--terra)",
  "var(--gold)",
  "var(--sage)",
  "var(--plum)",
  "var(--sky)",
];
const STUDIO_TINTS: Record<string, string> = {
  "var(--terra)": "var(--terra-tint)",
  "var(--gold)": "var(--gold-tint)",
  "var(--sage)": "var(--sage-tint)",
  "var(--plum)": "var(--plum-tint)",
  "var(--sky)": "var(--sky-tint)",
};

function projectColor(p: StoredItem): string {
  const seed = p.title ?? p.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return STUDIO_PALETTE[Math.abs(hash) % STUDIO_PALETTE.length];
}

function projectStatus(p: StoredItem): ProjectStatus {
  if (p.status === "archived") return "paused";
  const progress = ((p.metadata ?? {}) as { progress?: number }).progress ?? 0;
  if (progress >= 95) return "shipping";
  return "active";
}

function projectArea(p: StoredItem): string {
  const meta = (p.metadata ?? {}) as { area?: string };
  return meta.area?.trim() || p.topic?.trim() || "Uncategorized";
}

function isOpenTask(t: StoredItem): boolean {
  const m = (t.metadata ?? {}) as { completedAt?: string | null; reminder?: boolean };
  if (m.reminder === true) return false;
  return !m.completedAt && t.status !== "archived";
}

export default function ProjectsPage() {
  const rows =
    useLiveQuery(async () => {
      return await db.items.toArray();
    }) ?? [];

  const projects = useMemo(
    () => rows.filter((r) => r.kind === "project"),
    [rows],
  );
  const areas = useMemo(() => rows.filter((r) => r.kind === "area"), [rows]);
  const allTasks = useMemo(() => rows.filter((r) => r.kind === "task"), [rows]);
  const openTasks = useMemo(() => allTasks.filter(isOpenTask), [allTasks]);

  const completed = useMemo(
    () =>
      projects.filter(
        (p) => p.status === "archived" || projectStatus(p) === "shipping",
      ),
    [projects],
  );
  const active = projects.length - completed.length;
  const completedPct =
    projects.length > 0
      ? Math.round((completed.length / projects.length) * 100)
      : 0;

  // Group projects by area name (string field, opt-in).
  const grouped = useMemo(() => {
    const m = new Map<string, StoredItem[]>();
    for (const p of projects) {
      const a = projectArea(p);
      const arr = m.get(a) ?? [];
      arr.push(p);
      m.set(a, arr);
    }
    // Sort groups: known areas first by title order in area list, then alphabetical
    const areaTitles = new Set(areas.map((a) => a.title?.trim()).filter(Boolean));
    const ordered = [...m.entries()].sort(([a], [b]) => {
      const aIsArea = areaTitles.has(a);
      const bIsArea = areaTitles.has(b);
      if (aIsArea !== bIsArea) return aIsArea ? -1 : 1;
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
    return ordered;
  }, [projects, areas]);

  const isEmpty = projects.length === 0 && areas.length === 0;

  return (
    <div className="p-8 max-w-7xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <FolderKanban
              size={20}
              strokeWidth={1.6}
              className="text-[var(--terra)]"
            />
            Projects &amp; Areas
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Active work, life maintenance — grouped by where it lives.
          </p>
        </div>
        <NewProject />
      </header>

      {isEmpty ? (
        <EmptyHero />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger mb-8">
            <Stat
              label="Active"
              value={active}
              tone="ink"
              hint={`of ${projects.length} total`}
            />
            <Stat
              label="Tasks open"
              value={openTasks.length}
              tone="terra"
              hint="across all"
            />
            <Stat
              label="Completed"
              value={completed.length}
              tone="sage"
              hint={`${completedPct}% across all`}
            />
            <Stat label="Areas" value={areas.length} tone="ink" />
          </div>

          {grouped.length === 0 ? (
            <NoProjectsHint />
          ) : (
            grouped.map(([areaName, list]) => (
              <section key={areaName} className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
                    {areaName}
                  </h2>
                  <span
                    aria-hidden
                    className="flex-1 h-px"
                    style={{ background: "var(--line)" }}
                  />
                  <span className="font-mono text-[11px] text-[var(--muted)] tabular-nums">
                    {list.length} project{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 life-stagger">
                  {list.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Areas — keep as a separate section for area-kind items */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="inline-flex items-center gap-2 text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
                <Compass
                  size={17}
                  strokeWidth={1.6}
                  className="text-[var(--plum)]"
                />
                Areas
              </h2>
              <span
                aria-hidden
                className="flex-1 h-px"
                style={{ background: "var(--line)" }}
              />
              <span className="font-mono text-[11px] text-[var(--muted)] tabular-nums">
                {areas.length} area{areas.length === 1 ? "" : "s"}
              </span>
            </div>
            {areas.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[var(--line-2)] p-6 text-center">
                <div className="mx-auto mb-3 grid place-items-center w-12 h-12 rounded-full bg-[var(--paper)] text-[var(--plum)]"
                  style={{ boxShadow: "var(--shadow-1)" }}
                >
                  <Compass size={20} strokeWidth={1.6} />
                </div>
                <div className="text-[14px] text-[var(--ink)] font-medium">
                  Areas are ongoing parts of life.
                </div>
                <p className="mt-1 text-[12.5px] text-[var(--muted)] max-w-md mx-auto">
                  Health, Work, Relationships, Finances — they don't end, they
                  just need tending.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 life-stagger">
                {areas.map((a) => (
                  <AreaCard key={a.id} area={a} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Project card
// ──────────────────────────────────────────────────────────────────────

function ProjectCard({ project: p }: { project: StoredItem }) {
  const meta = (p.metadata ?? {}) as {
    targetDate?: string;
    progress?: number;
    area?: string;
  };
  const progress = Math.max(0, Math.min(100, meta.progress ?? 0));
  const color = projectColor(p);
  const tint = STUDIO_TINTS[color] ?? "var(--paper-2)";
  const status = projectStatus(p);
  const monogram = (p.title?.trim()?.[0] ?? "·").toUpperCase();
  const updatedRel = relDate(p.updatedAt);
  const due = meta.targetDate ? new Date(meta.targetDate) : null;

  return (
    <Link
      href={`/items/${p.id}`}
      className="group life-card life-card-hover flex flex-col overflow-hidden relative"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: color }}
      />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start gap-3">
          <div
            className="grid place-items-center w-10 h-10 rounded-[10px] text-[16px] font-semibold tracking-[-0.01em] shrink-0"
            style={{
              background: tint,
              color,
              border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
            }}
          >
            {monogram}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
              {p.title?.trim() || (
                <em className="text-[var(--muted-2)] not-italic">Untitled</em>
              )}
            </h3>
            {p.summary && (
              <p className="mt-1 text-[12.5px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                {p.summary}
              </p>
            )}
          </div>
          <StatusPill status={status} />
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--muted-2)] mb-1.5">
            <span>Progress</span>
            <span
              className="font-mono"
              style={{ color: progress > 0 ? color : "var(--muted-2)" }}
            >
              {progress}%
            </span>
          </div>
          <div
            className="h-[6px] rounded-full overflow-hidden"
            style={{ background: "var(--bg-2)" }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${progress}%`,
                background: color,
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="px-5 py-3 flex items-center gap-3 text-[11px] text-[var(--muted-2)] uppercase tracking-[0.1em] font-semibold border-t border-[var(--line)]"
      >
        <span className="inline-flex items-center gap-1.5">
          <Clock size={11} strokeWidth={1.6} />
          {updatedRel}
        </span>
        {due && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={11} strokeWidth={1.6} />
              due {dueLabel(due)}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: ProjectStatus }) {
  const meta: Record<
    ProjectStatus,
    { label: string; color: string; tint: string }
  > = {
    active: {
      label: "Active",
      color: "var(--sage)",
      tint: "var(--sage-tint)",
    },
    shipping: {
      label: "Shipping",
      color: "var(--gold)",
      tint: "var(--gold-tint)",
    },
    paused: {
      label: "Paused",
      color: "var(--muted)",
      tint: "var(--bg-2)",
    },
  };
  const m = meta[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] shrink-0"
      style={{ color: m.color, background: m.tint }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: m.color }}
      />
      {m.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Area card
// ──────────────────────────────────────────────────────────────────────

function AreaCard({ area }: { area: StoredItem }) {
  return (
    <Link
      href={`/items/${area.id}`}
      className="life-card life-card-hover p-5 block relative overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "var(--plum)" }}
      />
      <div className="flex items-start gap-3">
        <div
          className="grid place-items-center w-10 h-10 rounded-[10px] shrink-0"
          style={{
            background: "var(--plum-tint)",
            color: "var(--plum)",
            border: "1px solid color-mix(in oklch, var(--plum) 30%, transparent)",
          }}
        >
          <Compass size={18} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
            {area.title}
          </h3>
          {area.summary && (
            <p className="mt-1 text-[12.5px] text-[var(--muted)] line-clamp-2 leading-relaxed">
              {area.summary}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Atoms
// ──────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "ink" | "terra" | "gold" | "sage";
  hint?: string;
}) {
  const color =
    tone === "terra"
      ? "var(--terra)"
      : tone === "gold"
      ? "var(--gold)"
      : tone === "sage"
      ? "var(--sage)"
      : "var(--ink)";
  return (
    <div className="life-card p-5 flex flex-col">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-[34px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-[11px] text-[var(--muted)]">{hint}</div>
      )}
    </div>
  );
}

function NoProjectsHint() {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] p-6 text-center">
      <div className="text-[14px] text-[var(--ink)] font-medium">
        No projects yet.
      </div>
      <p className="mt-1 text-[12.5px] text-[var(--muted)]">
        Spin one up with the “+ New” button above.
      </p>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="mt-2 rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <FolderKanban size={22} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-medium text-[var(--ink)]">
        Organize life into projects and areas.
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        A project has a finish line (Ship the redesign, Move apartments). An
        area is ongoing (Health, Finances, Relationships). Both anchor
        everything else.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function relDate(d: Date): string {
  const diffMs = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function dueLabel(d: Date): string {
  return d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toLowerCase();
}
