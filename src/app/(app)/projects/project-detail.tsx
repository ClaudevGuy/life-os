"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Pin,
  Pause,
  Play,
  Archive,
  ArchiveRestore,
  Trash2,
  Plus,
  Check,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { db } from "@/lib/store/db";
import {
  updateItem,
  deleteItem,
  captureItem,
  type StoredItem,
} from "@/lib/store/items";
import { InlineBody } from "@/components/inline-edit";
import { PhotoGallery } from "@/components/photo-gallery";
import { Backlinks } from "@/components/backlinks";
import { RecentTracker } from "@/components/recently-viewed";
import { RepoGlyph } from "@/components/repo-glyph";
import {
  parseRepo,
  normalizeRepoUrl,
  providerLabel,
  type GitProvider,
} from "@/lib/github";

const PROVIDER_ACCENT: Record<GitProvider, string> = {
  github: "var(--ink)",
  gitlab: "var(--terra)",
  bitbucket: "var(--sky)",
  other: "var(--muted)",
};

type ProjectStatus = "active" | "shipping" | "paused";
type Milestone = { title: string; date?: string; done?: boolean };

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
const PRIORITY_COLOR: Record<string, string> = {
  high: "var(--terra)",
  medium: "var(--gold)",
  low: "var(--sage)",
};
const PRIORITY_TINT: Record<string, string> = {
  high: "var(--terra-tint)",
  medium: "var(--gold-tint)",
  low: "var(--sage-tint)",
};
const PRIORITY_LABEL: Record<string, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
};

function projectColor(p: { id: string; title: string | null }): string {
  const seed = p.title ?? p.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return STUDIO_PALETTE[Math.abs(hash) % STUDIO_PALETTE.length];
}

function resolveStatus(p: StoredItem): ProjectStatus {
  const m = (p.metadata ?? {}) as { status?: ProjectStatus; progress?: number };
  if (m.status === "paused" || m.status === "shipping" || m.status === "active") {
    return m.status;
  }
  const progress = m.progress ?? 0;
  if (progress >= 95) return "shipping";
  return "active";
}

export function ProjectDetail({ project }: { project: StoredItem }) {
  const router = useRouter();
  const meta = (project.metadata ?? {}) as {
    area?: string;
    targetDate?: string;
    progress?: number;
    status?: ProjectStatus;
    milestones?: Milestone[];
    repoUrl?: string;
  };
  const color = projectColor(project);
  const tint = STUDIO_TINTS[color] ?? "var(--paper-2)";
  const status = resolveStatus(project);
  const archived = project.status === "archived";
  const areaLabel = meta.area?.trim() || project.topic?.trim() || null;
  const monogram = (project.title?.trim()?.[0] ?? "·").toUpperCase();
  const repo = parseRepo(meta.repoUrl);

  // Tasks linked to this project via metadata.projectId
  const linkedTasks =
    useLiveQuery(async () => {
      const all = await db.items
        .where("kind")
        .equals("task")
        .toArray();
      return all.filter((t) => {
        const m = (t.metadata ?? {}) as { projectId?: string; reminder?: boolean };
        return m.projectId === project.id && m.reminder !== true;
      });
    }, [project.id]) ?? [];

  const openTasks = linkedTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return !m.completedAt && t.status !== "archived";
  });
  const completedTasks = linkedTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return m.completedAt || t.status === "archived";
  });

  // Progress: prefer task ratio if any tasks; else metadata.progress; else 0
  const taskProgress =
    linkedTasks.length > 0
      ? Math.round((completedTasks.length / linkedTasks.length) * 100)
      : null;
  const progress = taskProgress ?? meta.progress ?? 0;
  const totalTasks = linkedTasks.length;
  const doneCount = completedTasks.length;

  const milestones: Milestone[] = meta.milestones ?? [];

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto pg-enter">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-2 text-[12.5px] text-[var(--muted)] min-w-0">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition shrink-0"
          >
            <ArrowLeft size={13} strokeWidth={1.6} />
            Projects &amp; Areas
          </Link>
          {areaLabel && (
            <>
              <span className="text-[var(--muted-2)]" aria-hidden>
                ›
              </span>
              <span className="truncate">{areaLabel}</span>
            </>
          )}
          <span className="text-[var(--muted-2)]" aria-hidden>
            ›
          </span>
          <span className="text-[var(--ink)] font-medium truncate">
            {project.title?.trim() || "Untitled"}
          </span>
        </div>
        <ActionCluster
          project={project}
          status={status}
          archived={archived}
          onDeleted={() => router.push("/projects")}
        />
      </div>

      {/* Hero */}
      <section
        className="life-card overflow-hidden relative"
        style={archived ? { opacity: 0.7 } : undefined}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[6px]"
          style={{ background: color }}
        />
        <div className="p-7 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
          {/* Left: monogram + identity */}
          <div className="flex items-start gap-5 min-w-0">
            <div
              className="grid place-items-center w-[72px] h-[72px] rounded-[14px] text-[28px] font-semibold tracking-[-0.02em] shrink-0"
              style={{
                background: tint,
                color,
                border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
              }}
            >
              {monogram}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {areaLabel && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] bg-[var(--bg-2)]"
                  >
                    {areaLabel}
                  </span>
                )}
                <StatusPill status={status} />
                {archived && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] bg-[var(--bg-2)]"
                  >
                    Archived
                  </span>
                )}
                {repo && (
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={repo.url}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--ink)] bg-[var(--bg-2)] transition"
                  >
                    <RepoGlyph provider={repo.provider} size={12} />
                    {repo.repo || repo.host}
                    <ExternalLink
                      size={10}
                      strokeWidth={1.6}
                      className="opacity-0 group-hover:opacity-100 transition"
                    />
                  </a>
                )}
              </div>
              <InlineProjectTitle project={project} />
              <InlineProjectSummary project={project} />
            </div>
          </div>

          {/* Right: progress ring + key stats */}
          <div className="flex items-center gap-6 self-start lg:pl-4">
            <ProgressRing value={progress} color={color} />
            <div className="flex flex-col gap-2.5 min-w-[124px]">
              <HeroStat label="Open" value={openTasks.length} />
              <HeroStat
                label="Done"
                value={doneCount}
                accent="var(--sage)"
              />
              <HeroStat
                label="Due"
                value={
                  meta.targetDate ? dueLabel(new Date(meta.targetDate)) : "—"
                }
              />
            </div>
          </div>
        </div>

        {/* Pip bar */}
        <div className="px-7 pb-6">
          {totalTasks > 0 ? (
            <>
              <PipBar
                tasks={linkedTasks}
                color={color}
                onToggle={(taskId, nextDone) =>
                  toggleTaskDone(taskId, nextDone)
                }
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted)] font-mono tabular-nums">
                <span className="text-[var(--ink)]">
                  <span className="font-semibold">{doneCount}</span> of{" "}
                  {totalTasks} task{totalTasks === 1 ? "" : "s"} complete
                </span>
                <span style={{ color }}>{progress}%</span>
              </div>
            </>
          ) : (
            <div
              className="h-[6px] rounded-full overflow-hidden"
              style={{ background: "var(--bg-2)" }}
            >
              <div
                className="h-full transition-all"
                style={{ width: `${progress}%`, background: color }}
              />
            </div>
          )}
        </div>
      </section>

      {/* Two-column body */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        {/* Left: the work + notes */}
        <div className="flex flex-col gap-6">
          <TasksCard
            project={project}
            openTasks={openTasks}
            completedTasks={completedTasks}
            color={color}
          />
          <AboutCard project={project} />
          <PhotosCard project={project} />
        </div>

        {/* Right: properties + resources */}
        <div className="flex flex-col gap-6">
          <DetailsCard project={project} status={status} />
          <RepoCard project={project} />
          <MilestonesCard project={project} milestones={milestones} color={color} />
          <LinkedItemsCard project={project} />
        </div>
      </div>

      <RecentTracker id={project.id} title={project.title} kind={project.kind} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Action cluster
// ──────────────────────────────────────────────────────────────────────

function ActionCluster({
  project,
  status,
  archived,
  onDeleted,
}: {
  project: StoredItem;
  status: ProjectStatus;
  archived: boolean;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const paused = status === "paused";
  const meta = (project.metadata ?? {}) as { status?: ProjectStatus };

  function togglePin() {
    startTransition(async () => {
      try {
        await updateItem(project.id, { isPinned: !project.isPinned });
        toast.success(project.isPinned ? "Unpinned" : "Pinned");
      } catch {
        toast.error("Couldn't update");
      }
    });
  }

  function togglePause() {
    const next: ProjectStatus = paused ? "active" : "paused";
    startTransition(async () => {
      try {
        await updateItem(project.id, {
          metadata: { ...meta, status: next },
        });
        toast.success(paused ? "Resumed" : "Paused");
      } catch {
        toast.error("Couldn't update");
      }
    });
  }

  function toggleArchive() {
    const nextStatus = archived ? "active" : "archived";
    startTransition(async () => {
      try {
        await updateItem(project.id, { status: nextStatus });
        toast.success(archived ? "Restored" : "Archived");
      } catch {
        toast.error("Couldn't update");
      }
    });
  }

  function del() {
    if (!confirm(`Delete project "${project.title}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteItem(project.id);
        toast.success("Deleted");
        onDeleted();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <IconBtn
        onClick={togglePin}
        pending={pending}
        label={project.isPinned ? "Unpin" : "Pin"}
        icon={Pin}
        active={project.isPinned}
        accentColor="var(--gold)"
      />
      <IconBtn
        onClick={togglePause}
        pending={pending}
        label={paused ? "Resume" : "Pause"}
        icon={paused ? Play : Pause}
        active={paused}
        accentColor="var(--muted)"
      />
      <IconBtn
        onClick={toggleArchive}
        pending={pending}
        label={archived ? "Restore" : "Archive"}
        icon={archived ? ArchiveRestore : Archive}
      />
      <IconBtn
        onClick={del}
        pending={pending}
        label="Delete"
        icon={Trash2}
        danger
      />
    </div>
  );
}

function IconBtn({
  onClick,
  pending,
  label,
  icon: Icon,
  active,
  accentColor,
  danger,
}: {
  onClick: () => void;
  pending?: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  active?: boolean;
  accentColor?: string;
  danger?: boolean;
}) {
  const base =
    "grid place-items-center w-8 h-8 rounded-[8px] border transition disabled:opacity-50";
  const stateClass = active
    ? "border-[var(--line-2)]"
    : danger
    ? "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--terra-tint)] hover:text-[var(--bad)] hover:border-[var(--bad)]/30"
    : "border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)]";
  const activeStyle =
    active && accentColor
      ? {
          background: `color-mix(in oklch, ${accentColor} 16%, transparent)`,
          color: accentColor,
          borderColor: `color-mix(in oklch, ${accentColor} 30%, transparent)`,
        }
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      title={label}
      className={`${base} ${stateClass}`}
      style={activeStyle}
    >
      <Icon size={14} strokeWidth={1.6} />
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Hero atoms
// ──────────────────────────────────────────────────────────────────────

function InlineProjectTitle({ project }: { project: StoredItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.title ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(project.title ?? "");
  }, [project.title]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function save() {
    const trimmed = draft.trim();
    if (trimmed === (project.title ?? "")) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await updateItem(project.id, { title: trimmed || null });
        setEditing(false);
      } catch {
        toast.error("Couldn't save title");
      }
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setDraft(project.title ?? "");
            setEditing(false);
          }
        }}
        disabled={pending}
        className="bg-transparent w-full text-[36px] font-semibold tracking-[-0.025em] leading-[1.05] text-[var(--ink)] focus:outline-none border-b border-[var(--terra)] pb-1"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="text-left text-[36px] font-semibold tracking-[-0.025em] leading-[1.05] text-[var(--ink)] hover:text-[var(--terra)] transition"
    >
      {project.title?.trim() || (
        <em className="text-[var(--muted-2)] not-italic">Untitled</em>
      )}
    </button>
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em]"
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

function ProgressRing({
  value,
  color,
  size = 96,
  stroke = 9,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped / 100);
  const c = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--bg-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .55s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span
          className="text-[23px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
          style={{ color }}
        >
          {clamped}
          <span className="text-[13px] font-medium opacity-70">%</span>
        </span>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-2 last:border-0 last:pb-0">
      <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </span>
      <span
        className="font-mono text-[16px] font-semibold tabular-nums lowercase"
        style={{ color: accent ?? "var(--ink)" }}
      >
        {value}
      </span>
    </div>
  );
}

function InlineProjectSummary({ project }: { project: StoredItem }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.summary ?? "");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(project.summary ?? "");
  }, [project.summary]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function save() {
    const t = draft.trim();
    if (t === (project.summary ?? "")) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await updateItem(project.id, { summary: t || null });
        setEditing(false);
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            setDraft(project.summary ?? "");
            setEditing(false);
          }
        }}
        rows={2}
        disabled={pending}
        placeholder="A one-line description of this project…"
        className="mt-2 w-full max-w-xl bg-transparent text-[14.5px] text-[var(--muted)] leading-relaxed resize-none focus:outline-none border-b border-[var(--terra)] pb-1"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit"
      className="group mt-2 block text-left max-w-xl"
    >
      {project.summary?.trim() ? (
        <p className="text-[14.5px] text-[var(--muted)] leading-relaxed group-hover:text-[var(--ink-2)] transition">
          {project.summary}
        </p>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--muted-2)] italic group-hover:text-[var(--muted)] transition">
          <Pencil size={12} strokeWidth={1.6} />
          Add a one-line description
        </span>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Details card — consolidated project properties
// ──────────────────────────────────────────────────────────────────────

function DetailsCard({
  project,
  status,
}: {
  project: StoredItem;
  status: ProjectStatus;
}) {
  const meta = (project.metadata ?? {}) as { area?: string; targetDate?: string };
  const areaLabel = meta.area?.trim() || project.topic?.trim() || null;
  const due = meta.targetDate ? new Date(meta.targetDate) : null;
  const created = project.capturedAt ? new Date(project.capturedAt) : null;
  const updated = project.updatedAt ? new Date(project.updatedAt) : null;

  return (
    <section className="life-card p-5">
      <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)] mb-4">
        Details
      </h3>
      <dl className="flex flex-col">
        <DetailRow label="Status">
          <StatusPill status={status} />
        </DetailRow>
        <DetailRow label="Area">
          {areaLabel ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] bg-[var(--bg-2)]">
              {areaLabel}
            </span>
          ) : (
            <span className="text-[var(--muted-2)]">—</span>
          )}
        </DetailRow>
        <DetailRow label="Due">
          <span
            className="font-mono text-[12.5px] tabular-nums"
            style={{ color: due ? "var(--ink-2)" : "var(--muted-2)" }}
          >
            {due ? fullDate(due) : "—"}
          </span>
        </DetailRow>
        <DetailRow label="Created">
          <span className="font-mono text-[12.5px] tabular-nums text-[var(--muted)]">
            {created ? fullDate(created) : "—"}
          </span>
        </DetailRow>
        <DetailRow label="Updated">
          <span className="font-mono text-[12.5px] tabular-nums text-[var(--muted)]">
            {updated ? relativeFromNow(updated) : "—"}
          </span>
        </DetailRow>
      </dl>
    </section>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--line)] last:border-0">
      <dt className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Pip bar
// ──────────────────────────────────────────────────────────────────────

function PipBar({
  tasks,
  color,
  onToggle,
}: {
  tasks: StoredItem[];
  color: string;
  onToggle: (taskId: string, nextDone: boolean) => void;
}) {
  // Sort: completed first (filled), then open — so the bar reads left-to-right
  // as "done done done | open open open".
  const sorted = [...tasks].sort((a, b) => {
    const aDone = isDone(a);
    const bDone = isDone(b);
    if (aDone !== bDone) return aDone ? -1 : 1;
    return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
  });
  return (
    <div className="flex gap-[5px]">
      {sorted.map((t) => {
        const done = isDone(t);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id, !done)}
            title={t.title ?? "Untitled task"}
            aria-label={done ? `Reopen ${t.title ?? "task"}` : `Complete ${t.title ?? "task"}`}
            className="flex-1 h-[14px] rounded-[3px] transition"
            style={{
              background: done ? color : "transparent",
              border: `1.4px solid ${done ? color : "var(--line-2)"}`,
            }}
          />
        );
      })}
    </div>
  );
}

function isDone(t: StoredItem): boolean {
  const m = (t.metadata ?? {}) as { completedAt?: string | null };
  return Boolean(m.completedAt) || t.status === "archived";
}

async function toggleTaskDone(taskId: string, nextDone: boolean) {
  try {
    // Read fresh metadata so we don't clobber other fields.
    const current = await db.items.get(taskId);
    if (!current) return;
    const m = (current.metadata ?? {}) as Record<string, unknown>;
    await updateItem(taskId, {
      metadata: { ...m, completedAt: nextDone ? new Date().toISOString() : null },
      status: nextDone ? "archived" : "active",
    });
  } catch {
    toast.error("Couldn't update task");
  }
}

// ──────────────────────────────────────────────────────────────────────
// Tasks card
// ──────────────────────────────────────────────────────────────────────

function TasksCard({
  project,
  openTasks,
  completedTasks,
  color,
}: {
  project: StoredItem;
  openTasks: StoredItem[];
  completedTasks: StoredItem[];
  color: string;
}) {
  const [adding, setAdding] = useState(false);

  const sortedOpen = useMemo(
    () =>
      [...openTasks].sort((a, b) => {
        const pa = priorityWeight(a);
        const pb = priorityWeight(b);
        if (pa !== pb) return pb - pa;
        const da = dueTime(a);
        const dbb = dueTime(b);
        return da - dbb;
      }),
    [openTasks],
  );

  const sortedCompleted = useMemo(
    () =>
      [...completedTasks].sort((a, b) => {
        const am = (a.metadata ?? {}) as { completedAt?: string };
        const bm = (b.metadata ?? {}) as { completedAt?: string };
        const at = am.completedAt ? new Date(am.completedAt).getTime() : 0;
        const bt = bm.completedAt ? new Date(bm.completedAt).getTime() : 0;
        return bt - at;
      }),
    [completedTasks],
  );

  return (
    <section className="life-card p-6">
      <header className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
          Tasks
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="life-btn life-btn-sm life-btn-secondary"
        >
          <Plus size={12} strokeWidth={2} />
          Add task
        </button>
      </header>

      {adding && (
        <AddTaskInline
          projectId={project.id}
          color={color}
          onDone={() => setAdding(false)}
        />
      )}

      {openTasks.length === 0 && completedTasks.length === 0 && !adding ? (
        <EmptyTasks onAdd={() => setAdding(true)} color={color} />
      ) : (
        <>
          <TaskGroup
            label="Open"
            count={sortedOpen.length}
            tasks={sortedOpen}
            empty="Nothing open — every task is done. 🎉"
          />
          {sortedCompleted.length > 0 && (
            <TaskGroup
              label="Completed"
              count={sortedCompleted.length}
              tasks={sortedCompleted}
            />
          )}
        </>
      )}
    </section>
  );
}

function EmptyTasks({
  onAdd,
  color,
}: {
  onAdd: () => void;
  color: string;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-8 px-6 text-center">
      <div
        className="mx-auto mb-3 grid place-items-center w-11 h-11 rounded-full"
        style={{
          background: `color-mix(in oklch, ${color} 12%, transparent)`,
          color,
        }}
      >
        <Plus size={18} strokeWidth={1.8} />
      </div>
      <div className="text-[14px] font-medium text-[var(--ink)]">
        No tasks yet
      </div>
      <p className="mt-1 text-[12.5px] text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
        Break this project into next actions. Each one you check off fills the
        progress ring.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 life-btn life-btn-sm life-btn-primary mx-auto"
      >
        <Plus size={12} strokeWidth={2} />
        Add first task
      </button>
    </div>
  );
}

function AddTaskInline({
  projectId,
  color,
  onDone,
}: {
  projectId: string;
  color: string;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function save() {
    const t = title.trim();
    if (!t) {
      onDone();
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "task",
          title: t,
          status: "active",
          metadata: {
            projectId,
            priority,
            completedAt: null,
          },
        });
        toast.success("Task added");
        setTitle("");
        onDone();
      } catch {
        toast.error("Couldn't add task");
      }
    });
  }

  return (
    <div
      className="mb-4 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] focus-within:border-[var(--terra)] p-3 flex items-center gap-3 transition"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: color }}
      />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") onDone();
        }}
        placeholder="Task title"
        className="flex-1 bg-transparent text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
      />
      <div className="inline-flex items-center gap-1 p-0.5 rounded-full bg-[var(--paper)] border border-[var(--line)]">
        {(["low", "medium", "high"] as const).map((p) => {
          const active = priority === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`text-[10.5px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-full transition ${
                active ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              style={
                active
                  ? {
                      background: `color-mix(in oklch, ${PRIORITY_COLOR[p]} 16%, transparent)`,
                      color: PRIORITY_COLOR[p],
                    }
                  : undefined
              }
            >
              {PRIORITY_LABEL[p]}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="life-btn life-btn-sm life-btn-primary"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onDone}
        className="life-btn life-btn-sm life-btn-ghost"
      >
        Cancel
      </button>
    </div>
  );
}

function TaskGroup({
  label,
  count,
  tasks,
  empty,
}: {
  label: string;
  count: number;
  tasks: StoredItem[];
  empty?: string;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <h3 className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        {label} · {count}
      </h3>
      {tasks.length === 0 && empty ? (
        <p className="text-[12.5px] text-[var(--muted-2)] italic">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: StoredItem }) {
  const m = (task.metadata ?? {}) as {
    priority?: string;
    dueDate?: string;
    completedAt?: string | null;
  };
  const done = isDone(task);
  const priority = (m.priority ?? "medium") as keyof typeof PRIORITY_COLOR;
  const pColor = PRIORITY_COLOR[priority] ?? "var(--muted-2)";
  const pTint = PRIORITY_TINT[priority] ?? "var(--bg-2)";
  const pLabel = PRIORITY_LABEL[priority] ?? "—";
  const due = m.dueDate ? new Date(m.dueDate) : null;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => toggleTaskDone(task.id, !done)}
        aria-label={done ? "Reopen" : "Complete"}
        className="grid place-items-center w-[20px] h-[20px] rounded-[6px] transition shrink-0"
        style={{
          border: `1.6px solid ${done ? "var(--sage)" : pColor}`,
          background: done ? "var(--sage)" : "transparent",
          color: "var(--paper)",
        }}
      >
        {done && <Check size={12} strokeWidth={2.5} />}
      </button>
      <Link
        href={`/items/${task.id}`}
        className={`flex-1 text-[14px] truncate transition ${
          done
            ? "text-[var(--muted)] line-through"
            : "text-[var(--ink)] hover:text-[var(--terra)]"
        }`}
      >
        {task.title?.trim() || (
          <em className="text-[var(--muted-2)] not-italic">untitled</em>
        )}
      </Link>
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] shrink-0"
        style={{ color: pColor, background: pTint }}
      >
        {pLabel}
      </span>
      {due && (
        <span className="text-[11px] tabular-nums font-mono text-[var(--muted-2)] shrink-0 min-w-[40px] text-right">
          {dueLabel(due)}
        </span>
      )}
    </li>
  );
}

function priorityWeight(t: StoredItem): number {
  const p = ((t.metadata ?? {}) as { priority?: string }).priority;
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 0;
}

function dueTime(t: StoredItem): number {
  const d = ((t.metadata ?? {}) as { dueDate?: string }).dueDate;
  return d ? new Date(d).getTime() : Number.POSITIVE_INFINITY;
}

// ──────────────────────────────────────────────────────────────────────
// About / Photos / Linked items / Milestones
// ──────────────────────────────────────────────────────────────────────

function AboutCard({ project }: { project: StoredItem }) {
  return (
    <section className="life-card p-5">
      <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)] mb-3">
        About
      </h3>
      <div className="text-[14px] leading-[1.7] text-[var(--ink-2)]">
        <InlineBody id={project.id} value={project.body} />
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Repository card
// ──────────────────────────────────────────────────────────────────────

function RepoCard({ project }: { project: StoredItem }) {
  const meta = (project.metadata ?? {}) as { repoUrl?: string };
  const repo = parseRepo(meta.repoUrl);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meta.repoUrl ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(meta.repoUrl ?? "");
  }, [meta.repoUrl]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const preview = useMemo(() => parseRepo(draft), [draft]);
  const showEditor = editing || !repo;
  const accent = PROVIDER_ACCENT[(preview ?? repo)?.provider ?? "github"];

  function save() {
    const url = normalizeRepoUrl(draft);
    startTransition(async () => {
      try {
        const next = { ...(project.metadata ?? {}) } as Record<string, unknown>;
        if (url) next.repoUrl = url;
        else delete next.repoUrl;
        await updateItem(project.id, { metadata: next });
        toast.success(url ? "Repository linked" : "Repository removed");
        setEditing(false);
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  function remove() {
    const next = { ...(project.metadata ?? {}) } as Record<string, unknown>;
    delete next.repoUrl;
    startTransition(async () => {
      try {
        await updateItem(project.id, { metadata: next });
        toast.success("Repository removed");
        setDraft("");
        setEditing(false);
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  return (
    <section className="life-card p-5">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
          Repository
        </h3>
        {repo && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(meta.repoUrl ?? "");
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition"
          >
            <Pencil size={12} strokeWidth={1.6} />
            Edit
          </button>
        )}
      </header>

      {showEditor ? (
        <div>
          <div className="flex items-center gap-2 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] focus-within:border-[var(--terra)] px-3 transition">
            <span className="shrink-0" style={{ color: accent }}>
              <RepoGlyph provider={preview?.provider ?? "github"} size={15} />
            </span>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
                if (e.key === "Escape") {
                  setDraft(meta.repoUrl ?? "");
                  setEditing(false);
                }
              }}
              placeholder="github.com/owner/repo"
              className="flex-1 bg-transparent py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
            />
          </div>
          {preview?.owner && preview?.repo && (
            <div className="mt-2 text-[12px] font-mono text-[var(--muted)] truncate">
              {preview.owner}
              <span className="text-[var(--muted-2)]"> / </span>
              <span className="text-[var(--ink-2)] font-medium">
                {preview.repo}
              </span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              {repo && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--bad)] transition"
                >
                  <Trash2 size={12} strokeWidth={1.6} />
                  Remove
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editing && repo && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(meta.repoUrl ?? "");
                    setEditing(false);
                  }}
                  className="life-btn life-btn-sm life-btn-ghost"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={pending || !preview}
                className="life-btn life-btn-sm life-btn-primary"
              >
                {repo ? "Save" : "Link repo"}
              </button>
            </div>
          </div>
          {!repo && (
            <p className="mt-3 text-[11.5px] text-[var(--muted-2)] leading-relaxed">
              Paste a GitHub, GitLab, or Bitbucket URL — or just{" "}
              <span className="font-mono text-[var(--muted)]">owner/repo</span>.
            </p>
          )}
        </div>
      ) : (
        repo && (
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3.5 rounded-[10px] -m-1 p-1 hover:bg-[var(--paper-2)] transition"
          >
            <div
              className="grid place-items-center w-11 h-11 rounded-[11px] shrink-0"
              style={{
                background: `color-mix(in oklch, ${accent} 12%, transparent)`,
                border: `1px solid color-mix(in oklch, ${accent} 26%, transparent)`,
                color: accent,
              }}
            >
              <RepoGlyph provider={repo.provider} size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {providerLabel(repo.provider)}
              </div>
              <div className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)] truncate group-hover:text-[var(--terra)] transition">
                {repo.owner && repo.repo ? (
                  <>
                    {repo.owner}
                    <span className="text-[var(--muted-2)] font-normal"> / </span>
                    {repo.repo}
                  </>
                ) : (
                  repo.host
                )}
              </div>
              <div className="text-[11.5px] font-mono text-[var(--muted-2)] truncate">
                {repo.host}
              </div>
            </div>
            <span className="life-btn life-btn-sm life-btn-secondary shrink-0">
              <ExternalLink size={12} strokeWidth={1.8} />
              Open
            </span>
          </a>
        )
      )}
    </section>
  );
}

function PhotosCard({ project }: { project: StoredItem }) {
  return (
    <section className="life-card p-5">
      <PhotoGallery
        itemId={project.id}
        metadata={(project.metadata ?? {}) as Record<string, unknown>}
        emptyHint="Drop an image, click, or paste (⌘V)"
      />
    </section>
  );
}

function LinkedItemsCard({ project }: { project: StoredItem }) {
  // Backlinks already renders its own card; wrap in a sentinel so it only
  // shows when there are actual mentions (Backlinks returns null if none).
  return (
    <Backlinks
      item={{ id: project.id, title: project.title, kind: project.kind }}
    />
  );
}

function MilestonesCard({
  project,
  milestones,
  color,
}: {
  project: StoredItem;
  milestones: Milestone[];
  color: string;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(next: Milestone[]) {
    const meta = { ...(project.metadata ?? {}), milestones: next };
    startTransition(async () => {
      try {
        await updateItem(project.id, { metadata: meta });
      } catch {
        toast.error("Couldn't update milestones");
      }
    });
  }

  function toggle(idx: number) {
    const next = milestones.map((m, i) =>
      i === idx ? { ...m, done: !m.done } : m,
    );
    persist(next);
  }

  function add(title: string, date: string) {
    const next = [
      ...milestones,
      { title, date: date || undefined, done: false },
    ];
    persist(next);
  }

  function remove(idx: number) {
    const next = milestones.filter((_, i) => i !== idx);
    persist(next);
  }

  return (
    <section className="life-card p-5">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
          Milestones
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1 transition"
        >
          <Plus size={12} strokeWidth={1.6} />
          Add
        </button>
      </header>

      {adding && (
        <MilestoneAddInline
          onAdd={(title, date) => {
            add(title, date);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {milestones.length === 0 && !adding ? (
        <p className="text-[12.5px] text-[var(--muted-2)] italic">
          No milestones yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((m, i) => (
            <li key={i} className="flex items-center gap-2.5 group">
              <button
                type="button"
                onClick={() => toggle(i)}
                disabled={pending}
                aria-label={m.done ? "Reopen" : "Complete"}
                className="grid place-items-center w-[18px] h-[18px] rounded-full transition shrink-0"
                style={{
                  border: `1.6px solid ${m.done ? color : "var(--line-2)"}`,
                  background: m.done ? color : "transparent",
                  color: "var(--paper)",
                }}
              >
                {m.done && <Check size={10} strokeWidth={2.5} />}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-[13.5px] truncate ${
                    m.done ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"
                  }`}
                >
                  {m.title}
                </div>
                {m.date && (
                  <div className="text-[11px] font-mono tabular-nums text-[var(--muted-2)] mt-0.5">
                    {dueLabel(new Date(m.date))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove milestone"
                title="Remove"
                className="opacity-0 group-hover:opacity-100 transition text-[var(--muted-2)] hover:text-[var(--bad)]"
              >
                <Trash2 size={12} strokeWidth={1.6} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MilestoneAddInline({
  onAdd,
  onCancel,
}: {
  onAdd: (title: string, date: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  function commit() {
    const t = title.trim();
    if (!t) {
      onCancel();
      return;
    }
    onAdd(t, date);
  }

  return (
    <div className="mb-3 flex items-center gap-2">
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Milestone title"
        className="flex-1 rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-2.5 py-1.5 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        className="rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-2 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition"
      />
      <button
        type="button"
        onClick={commit}
        className="life-btn life-btn-sm life-btn-primary"
      >
        Add
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function dueLabel(d: Date): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (d >= start && d < end) return "today";
  const tomorrow = new Date(end);
  tomorrow.setDate(end.getDate() + 1);
  if (d >= end && d < tomorrow) return "tmrw";
  const days = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  if (days >= -6 && days <= 6) {
    return d.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase();
  }
  return d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toLowerCase();
}

/** "Jun 12, 2026" — full, unambiguous date for the Details panel. */
function fullDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "just now" / "3h ago" / "yesterday" / "2w ago" — for the Updated row. */
function relativeFromNow(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
