"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import type { StoredItem } from "@/lib/store/items";
import { FolderKanban, Calendar, Clock, ExternalLink } from "lucide-react";
import { NewProject } from "./new-project";
import { parseRepo } from "@/lib/github";
import { RepoGlyph } from "@/components/repo-glyph";
import { ProgressRing } from "@/components/progress-ring";

type ProjectTasks = { open: StoredItem[]; done: StoredItem[] };

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
  // Prefer explicit metadata.status; fall back to derived from archived /
  // progress so older projects without the field still render correctly.
  const m = (p.metadata ?? {}) as { status?: ProjectStatus; progress?: number };
  if (m.status === "paused" || m.status === "shipping" || m.status === "active") {
    return m.status;
  }
  if (p.status === "archived") return "paused";
  if ((m.progress ?? 0) >= 95) return "shipping";
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
  const allTasks = useMemo(() => rows.filter((r) => r.kind === "task"), [rows]);
  const openTasks = useMemo(() => allTasks.filter(isOpenTask), [allTasks]);

  // Index tasks by projectId once so each card filters in O(1).
  const tasksByProject = useMemo(() => {
    const m = new Map<string, ProjectTasks>();
    for (const t of allTasks) {
      const tm = (t.metadata ?? {}) as { projectId?: string; reminder?: boolean };
      if (!tm.projectId || tm.reminder === true) continue;
      const bucket = m.get(tm.projectId) ?? { open: [], done: [] };
      if (isOpenTask(t)) bucket.open.push(t);
      else bucket.done.push(t);
      m.set(tm.projectId, bucket);
    }
    return m;
  }, [allTasks]);

  const completed = useMemo(
    () =>
      projects.filter(
        (p) => p.status === "archived" || projectStatus(p) === "shipping",
      ),
    [projects],
  );
  const active = projects.length - completed.length;

  // Aggregate task completion across every project — drives the portfolio ring.
  const portfolio = useMemo(() => {
    let done = 0;
    let total = 0;
    for (const bucket of tasksByProject.values()) {
      done += bucket.done.length;
      total += bucket.open.length + bucket.done.length;
    }
    return {
      done,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasksByProject]);

  // Group projects by their optional group/area string field.
  const grouped = useMemo(() => {
    const m = new Map<string, StoredItem[]>();
    for (const p of projects) {
      const a = projectArea(p);
      const arr = m.get(a) ?? [];
      arr.push(p);
      m.set(a, arr);
    }
    // Alphabetical, with the catch-all group sinking to the bottom.
    return [...m.entries()].sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [projects]);

  const isEmpty = projects.length === 0;

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
            Projects
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Everything you&apos;re actively moving forward.
          </p>
        </div>
        <NewProject />
      </header>

      {isEmpty ? (
        <EmptyHero />
      ) : (
        <>
          <PortfolioBand
            pct={portfolio.pct}
            done={portfolio.done}
            total={portfolio.total}
            active={active}
            projectTotal={projects.length}
            openTasks={openTasks.length}
            completed={completed.length}
          />

          {grouped.length === 0 ? (
            <NoProjectsHint />
          ) : (
            grouped.map(([areaName, list]) => {
              const displayName =
                areaName === "Uncategorized" && grouped.length === 1
                  ? "All projects"
                  : areaName;
              return (
                <section key={areaName} className="mb-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
                      {displayName}
                    </h2>
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[20px] px-1.5 rounded-full bg-[var(--bg-2)] text-[11px] font-mono font-semibold text-[var(--muted)] tabular-nums">
                      {list.length}
                    </span>
                    <span
                      aria-hidden
                      className="flex-1 h-px"
                      style={{ background: "var(--line)" }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 life-stagger">
                    {list.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        tasks={tasksByProject.get(p.id) ?? null}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Project card
// ──────────────────────────────────────────────────────────────────────

function ProjectCard({
  project: p,
  tasks,
}: {
  project: StoredItem;
  tasks: ProjectTasks | null;
}) {
  const meta = (p.metadata ?? {}) as {
    targetDate?: string;
    progress?: number;
    area?: string;
    repoUrl?: string;
  };
  const repo = parseRepo(meta.repoUrl);
  const color = projectColor(p);
  const tint = STUDIO_TINTS[color] ?? "var(--paper-2)";
  const status = projectStatus(p);
  const monogram = (p.title?.trim()?.[0] ?? "·").toUpperCase();
  const updatedRel = relDate(p.updatedAt);
  const due = meta.targetDate ? new Date(meta.targetDate) : null;

  const openCount = tasks?.open.length ?? 0;
  const doneCount = tasks?.done.length ?? 0;
  const totalTasks = openCount + doneCount;

  // Prefer real task ratio; fall back to metadata.progress for unwired projects.
  const progress =
    totalTasks > 0
      ? Math.round((doneCount / totalTasks) * 100)
      : Math.max(0, Math.min(100, meta.progress ?? 0));

  // NEXT UP: highest-priority open task, earliest due date.
  const nextUp = useMemo(() => {
    if (!tasks || tasks.open.length === 0) return null;
    return [...tasks.open].sort((a, b) => {
      const pa = priorityRank(a);
      const pb = priorityRank(b);
      if (pa !== pb) return pb - pa;
      const da = dueTimestamp(a);
      const dbb = dueTimestamp(b);
      return da - dbb;
    })[0];
  }, [tasks]);

  return (
    <Link
      href={`/items/${p.id}`}
      className="group life-card life-card-hover flex flex-col overflow-hidden relative"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] z-[2]"
        style={{ background: color }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklch, ${color} 7%, transparent), transparent)`,
        }}
      />
      <div className="relative p-5 flex flex-col gap-4 flex-1">
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

        <div className="mt-auto flex flex-col gap-2.5">
          {totalTasks > 0 ? (
            <>
              <PipPreview total={totalTasks} done={doneCount} color={color} />
              <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--muted-2)]">
                <span className="font-mono">
                  {doneCount} / {totalTasks} done
                </span>
                <span className="font-mono" style={{ color }}>
                  {progress}%
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              <span
                className="flex-1 h-[6px] rounded-full"
                style={{ background: "var(--bg-2)" }}
              />
              <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--muted-2)] shrink-0">
                No tasks yet
              </span>
            </div>
          )}
        </div>

        {nextUp && <NextUpRow task={nextUp} color={color} />}
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
        {repo && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(repo.url, "_blank", "noopener,noreferrer");
            }}
            title={`Open ${repo.host}/${repo.owner}/${repo.repo}`}
            className="group/repo ml-auto inline-flex items-center gap-1.5 max-w-[55%] rounded-full px-2 py-1 -my-1 normal-case tracking-normal text-[11px] font-mono text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
          >
            <RepoGlyph
              provider={repo.provider}
              size={13}
              className="shrink-0"
            />
            <span className="truncate">
              {repo.owner && repo.repo ? `${repo.owner}/${repo.repo}` : repo.host}
            </span>
            <ExternalLink
              size={10}
              strokeWidth={1.6}
              className="shrink-0 opacity-0 group-hover/repo:opacity-100 transition"
            />
          </button>
        )}
      </div>
    </Link>
  );
}

function PipPreview({
  total,
  done,
  color,
}: {
  total: number;
  done: number;
  color: string;
}) {
  // Cap the pip count so very large task lists don't shrink to invisible.
  const cap = 8;
  const renderCount = Math.min(total, cap);
  const doneShown = total <= cap
    ? done
    : Math.round((done / total) * cap);
  return (
    <div className="flex gap-[5px]">
      {Array.from({ length: renderCount }).map((_, i) => {
        const filled = i < doneShown;
        return (
          <span
            key={i}
            className="flex-1 h-[10px] rounded-[3px]"
            style={{
              background: filled ? color : "transparent",
              border: `1.4px solid ${filled ? color : "var(--line-2)"}`,
            }}
          />
        );
      })}
    </div>
  );
}

function NextUpRow({ task, color }: { task: StoredItem; color: string }) {
  const m = (task.metadata ?? {}) as { dueDate?: string };
  const due = m.dueDate ? new Date(m.dueDate) : null;
  return (
    <div
      className="rounded-[10px] p-3 flex items-center gap-3"
      style={{ background: "var(--paper-2)" }}
    >
      <span
        className="grid place-items-center w-4 h-4 rounded-[5px] shrink-0"
        style={{ border: `1.4px solid ${color}` }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)]">
          Next up
        </div>
        <div className="text-[13.5px] text-[var(--ink)] truncate">
          {task.title?.trim() || "untitled"}
        </div>
      </div>
      {due && (
        <span className="text-[11px] font-mono tabular-nums uppercase tracking-[0.1em] text-[var(--muted-2)] shrink-0">
          {dueLabel(due)}
        </span>
      )}
    </div>
  );
}

function priorityRank(t: StoredItem): number {
  const p = ((t.metadata ?? {}) as { priority?: string }).priority;
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 0;
}

function dueTimestamp(t: StoredItem): number {
  const d = ((t.metadata ?? {}) as { dueDate?: string }).dueDate;
  return d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
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
// Atoms
// ──────────────────────────────────────────────────────────────────────

function PortfolioBand({
  pct,
  done,
  total,
  active,
  projectTotal,
  openTasks,
  completed,
}: {
  pct: number;
  done: number;
  total: number;
  active: number;
  projectTotal: number;
  openTasks: number;
  completed: number;
}) {
  return (
    <section className="life-card p-6 mb-9 flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-6">
      {/* Aggregate completion ring */}
      <div className="flex items-center gap-5 shrink-0">
        <ProgressRing value={pct} color="var(--terra)" size={86} stroke={8} />
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
            Task completion
          </div>
          <div className="mt-1.5 text-[15px] text-[var(--ink)] leading-tight">
            {total > 0 ? (
              <>
                <span className="font-semibold tabular-nums">{done}</span>
                <span className="text-[var(--muted)]"> of {total} done</span>
              </>
            ) : (
              <span className="text-[var(--muted)]">No tasks tracked yet</span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] text-[var(--muted-2)]">
            across {projectTotal} project{projectTotal === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <span className="hidden sm:block w-px self-stretch bg-[var(--line)]" />

      {/* Headline counts */}
      <div className="grid grid-cols-3 sm:flex sm:flex-1 sm:justify-around gap-x-6 gap-y-5">
        <PortfolioStat label="Active" value={active} hint={`of ${projectTotal}`} />
        <PortfolioStat
          label="Open tasks"
          value={openTasks}
          accent="var(--terra)"
        />
        <PortfolioStat
          label="Completed"
          value={completed}
          accent="var(--sage)"
          hint="projects"
        />
      </div>
    </section>
  );
}

function PortfolioStat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-1.5 text-[30px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color: accent ?? "var(--ink)" }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-[11px] text-[var(--muted-2)]">{hint}</div>
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
