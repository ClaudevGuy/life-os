"use client";

import { useMemo, useState } from "react";
import {
  Target,
  Trophy,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  Circle,
  Flag,
  TrendingUp,
  HeartPulse,
  Briefcase,
  Wallet,
  Users,
  Sprout,
  Brain,
  Smile,
  Home,
  type LucideIcon,
} from "lucide-react";
import {
  useItemsOfKind,
  updateItem,
  deleteItem,
  type StoredItem,
} from "@/lib/store/items";
import {
  readGoal,
  goalProgress,
  isAchieved,
  paceDelta,
  deadlineLabel,
  categoryColor,
  TIMEFRAMES,
  TIMEFRAME_LABEL,
  TIMEFRAME_BADGE,
  type GoalMeta,
  type Timeframe,
  type Milestone,
} from "@/lib/goals";
import { NewGoalButton, GoalModal } from "./goal-modal";

const CAT_ICON: Record<string, LucideIcon> = {
  Health: HeartPulse,
  Career: Briefcase,
  Money: Wallet,
  Relationships: Users,
  Growth: Sprout,
  Mind: Brain,
  Fun: Smile,
  Home: Home,
};

type View = { item: StoredItem; meta: GoalMeta; progress: number; achieved: boolean };

export default function GoalsPage() {
  const rows = (useItemsOfKind("goal") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [filter, setFilter] = useState<Timeframe | "all">("all");

  const views = useMemo<View[]>(
    () =>
      rows.map((item) => {
        const meta = readGoal(item);
        return { item, meta, progress: goalProgress(meta), achieved: isAchieved(meta) };
      }),
    [rows],
  );

  const active = views.filter((v) => !v.achieved);
  const achieved = views.filter((v) => v.achieved);

  const avgProgress = active.length
    ? Math.round(active.reduce((s, v) => s + v.progress, 0) / active.length)
    : 0;
  const onTrack = active.filter((v) => {
    const d = paceDelta(v.meta, new Date(v.item.createdAt));
    return d === null || d >= -5;
  }).length;
  const achievedThisYear = achieved.filter((v) => {
    const at = v.meta.achievedAt ? new Date(v.meta.achievedAt) : null;
    return at && at.getFullYear() === new Date().getFullYear();
  }).length;

  const visibleActive =
    filter === "all" ? active : active.filter((v) => v.meta.timeframe === filter);

  const groups: { tf: Timeframe; items: View[] }[] = TIMEFRAMES.map((tf) => ({
    tf,
    items: visibleActive
      .filter((v) => v.meta.timeframe === tf)
      .sort((a, b) => a.progress - b.progress),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto pg-enter space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Target size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
            Goals
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Your north star. Set what matters, link it to who you&apos;re
            becoming, and watch progress roll in on its own.
          </p>
        </div>
        <NewGoalButton />
      </header>

      {views.length === 0 ? (
        <EmptyHero />
      ) : (
        <>
          <Overview
            avgProgress={avgProgress}
            active={active.length}
            achievedThisYear={achievedThisYear}
            onTrack={onTrack}
          />

          {/* Timeframe filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterPill>
            {TIMEFRAMES.map((tf) => (
              <FilterPill
                key={tf}
                active={filter === tf}
                onClick={() => setFilter(tf)}
              >
                {TIMEFRAME_BADGE[tf]}
              </FilterPill>
            ))}
          </div>

          {groups.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)] py-6 text-center">
              No active goals in this horizon.
            </p>
          ) : (
            groups.map((g) => (
              <section key={g.tf} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--muted)]">
                    {TIMEFRAME_LABEL[g.tf]}
                  </h2>
                  <span className="text-[11px] text-[var(--muted-2)] tabular-nums">
                    {g.items.length}
                  </span>
                  <span className="flex-1 h-px bg-[var(--line)]" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {g.items.map((v) => (
                    <GoalCard key={v.item.id} view={v} onEdit={() => setEditing(v.item)} />
                  ))}
                </div>
              </section>
            ))
          )}

          {achieved.length > 0 && (
            <section className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--muted)] inline-flex items-center gap-1.5">
                  <Trophy size={13} className="text-[var(--gold)]" />
                  Achieved
                </h2>
                <span className="text-[11px] text-[var(--muted-2)] tabular-nums">
                  {achieved.length}
                </span>
                <span className="flex-1 h-px bg-[var(--line)]" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {achieved.map((v) => (
                  <GoalCard key={v.item.id} view={v} onEdit={() => setEditing(v.item)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {editing && (
        <GoalModal existing={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Overview
// ──────────────────────────────────────────────────────────────────────

function Overview({
  avgProgress,
  active,
  achievedThisYear,
  onTrack,
}: {
  avgProgress: number;
  active: number;
  achievedThisYear: number;
  onTrack: number;
}) {
  return (
    <section className="life-card p-6 relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "var(--terra)" }}
      />
      <span
        aria-hidden
        className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--terra) 14%, transparent), transparent 70%)",
        }}
      />
      <div className="relative flex items-center gap-6 flex-wrap sm:flex-nowrap">
        <Ring pct={avgProgress} color="var(--terra)" size={104} stroke={9}>
          <div className="text-center">
            <div className="text-[26px] font-semibold tabular-nums leading-none text-[var(--ink)]">
              {avgProgress}
              <span className="text-[14px]">%</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] mt-1">
              avg
            </div>
          </div>
        </Ring>
        <div className="flex-1 min-w-0 grid grid-cols-3 gap-4">
          <OverviewStat label="Active" value={active} icon={Flag} tone="var(--ink)" />
          <OverviewStat
            label="On track"
            value={onTrack}
            icon={TrendingUp}
            tone="var(--sage)"
          />
          <OverviewStat
            label="Achieved"
            value={achievedThisYear}
            icon={Trophy}
            tone="var(--gold)"
            hint="this year"
          />
        </div>
      </div>
    </section>
  );
}

function OverviewStat({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        <Icon size={12} style={{ color: tone }} />
        {label}
      </div>
      <div
        className="mt-1.5 text-[30px] font-semibold tabular-nums leading-none"
        style={{ color: tone }}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-[var(--muted-2)]">{hint}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Goal card
// ──────────────────────────────────────────────────────────────────────

function GoalCard({ view, onEdit }: { view: View; onEdit: () => void }) {
  const { item, meta, progress, achieved } = view;
  const color = categoryColor(meta.category);
  const Icon = CAT_ICON[meta.category] ?? Target;
  const pace = paceDelta(meta, new Date(item.createdAt));
  const dl = deadlineLabel(meta.targetDate);

  async function patch(p: Partial<GoalMeta>) {
    await updateItem(item.id, { metadata: { ...meta, ...p } });
  }
  function toggleAchieved() {
    patch({ achievedAt: achieved ? null : new Date().toISOString() });
  }
  function remove() {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    deleteItem(item.id);
  }

  return (
    <div className="group life-card p-5 relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: color, opacity: achieved ? 0.5 : 1 }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-start gap-3 min-w-0 text-left"
        >
          <span
            className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0"
            style={{
              background: `color-mix(in oklch, ${color} 14%, transparent)`,
              color,
              border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
            }}
          >
            <Icon size={18} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] uppercase tracking-[0.12em] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  color,
                  background: `color-mix(in oklch, ${color} 12%, transparent)`,
                }}
              >
                {meta.category}
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted-2)]">
                {TIMEFRAME_BADGE[meta.timeframe]}
              </span>
            </div>
            <h3
              className={`mt-1 text-[17px] font-semibold tracking-[-0.015em] leading-snug ${
                achieved
                  ? "text-[var(--muted)]"
                  : "text-[var(--ink)] group-hover:text-[var(--terra)]"
              } transition`}
            >
              {item.title}
            </h3>
            {meta.identity && (
              <p className="mt-0.5 text-[12.5px] text-[var(--muted)] italic leading-snug">
                {meta.identity}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <IconBtn title={achieved ? "Reopen" : "Mark achieved"} onClick={toggleAchieved}>
            <Trophy
              size={13}
              className={achieved ? "text-[var(--gold)]" : ""}
              fill={achieved ? "var(--gold)" : "none"}
            />
          </IconBtn>
          <IconBtn title="Edit" onClick={onEdit}>
            <Pencil size={13} />
          </IconBtn>
          <IconBtn title="Delete" onClick={remove} danger>
            <Trash2 size={13} />
          </IconBtn>
        </div>
      </div>

      {/* Progress body */}
      <div className="mt-4 flex items-center gap-4">
        <Ring pct={progress} color={achieved ? "var(--gold)" : color} size={68} stroke={7}>
          {achieved ? (
            <Check size={22} className="text-[var(--gold)]" strokeWidth={2.4} />
          ) : (
            <span className="text-[15px] font-semibold tabular-nums text-[var(--ink)]">
              {Math.round(progress)}
              <span className="text-[9px]">%</span>
            </span>
          )}
        </Ring>

        <div className="flex-1 min-w-0">
          {meta.metric === "manual" && !achieved && (
            <ManualControl color={color} value={meta.progress ?? 0} onCommit={(p) => patch({ progress: p })} />
          )}
          {meta.metric === "number" && (
            <NumberControl
              meta={meta}
              color={color}
              disabled={achieved}
              onCommit={(c) => patch({ current: c })}
            />
          )}
          {meta.metric === "milestones" && (
            <MilestoneList
              meta={meta}
              color={color}
              onToggle={(id) =>
                patch({
                  milestones: (meta.milestones ?? []).map((m) =>
                    m.id === id ? { ...m, done: !m.done } : m,
                  ),
                })
              }
            />
          )}
          {meta.metric === "manual" && achieved && (
            <p className="text-[12.5px] text-[var(--muted)]">Goal complete.</p>
          )}
        </div>
      </div>

      {/* Footer: pace / deadline */}
      {!achieved && (dl || pace !== null) && (
        <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11.5px]">
          {dl ? (
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
              <Flag size={11} />
              {dl}
            </span>
          ) : (
            <span />
          )}
          {pace !== null && (
            <span
              className="font-medium"
              style={{
                color: pace >= -5 ? "var(--sage)" : "var(--gold)",
              }}
            >
              {pace >= -5 ? "On track" : "Needs a push"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ManualControl({
  color,
  value,
  onCommit,
}: {
  color: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [local, setLocal] = useState(value);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mb-1.5">
        <span>Drag to update</span>
        <span className="tabular-nums font-semibold" style={{ color }}>
          {Math.round(local)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        onMouseUp={() => onCommit(Math.round(local))}
        onTouchEnd={() => onCommit(Math.round(local))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function NumberControl({
  meta,
  color,
  disabled,
  onCommit,
}: {
  meta: GoalMeta;
  color: string;
  disabled?: boolean;
  onCommit: (n: number) => void;
}) {
  const [local, setLocal] = useState(String(meta.current ?? 0));
  const unit = meta.unit ?? "";
  const fmt = (n: number) =>
    `${unit === "$" ? "$" : ""}${n.toLocaleString()}${unit && unit !== "$" ? ` ${unit}` : ""}`;
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        {disabled ? (
          <span className="text-[18px] font-semibold tabular-nums text-[var(--ink)]">
            {fmt(meta.current ?? 0)}
          </span>
        ) : (
          <input
            value={local}
            inputMode="decimal"
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => {
              const n = Number(local);
              if (Number.isFinite(n)) onCommit(n);
              else setLocal(String(meta.current ?? 0));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="w-24 rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-2 py-1 text-[16px] font-semibold tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition"
          />
        )}
        <span className="text-[13px] text-[var(--muted)] tabular-nums">
          / {fmt(meta.target ?? 0)}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${goalProgress(meta)}%`, background: color }}
        />
      </div>
    </div>
  );
}

function MilestoneList({
  meta,
  color,
  onToggle,
}: {
  meta: GoalMeta;
  color: string;
  onToggle: (id: string) => void;
}) {
  const ms = meta.milestones ?? [];
  return (
    <ul className="space-y-1 max-h-[132px] overflow-y-auto pr-1">
      {ms.map((m: Milestone) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => onToggle(m.id)}
            className="flex items-center gap-2 text-left w-full group/ms"
          >
            {m.done ? (
              <CheckCircle2 size={15} style={{ color }} className="shrink-0" />
            ) : (
              <Circle size={15} className="text-[var(--muted-2)] shrink-0" />
            )}
            <span
              className={`text-[13px] leading-snug ${
                m.done
                  ? "text-[var(--muted-2)] line-through"
                  : "text-[var(--ink-2)] group-hover/ms:text-[var(--ink)]"
              } transition`}
            >
              {m.text}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Atoms
// ──────────────────────────────────────────────────────────────────────

function Ring({
  pct,
  color,
  size,
  stroke,
  children,
}: {
  pct: number;
  color: string;
  size: number;
  stroke: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] transition ${
        danger
          ? "hover:text-[var(--bad)] hover:border-[var(--bad)]/30 hover:bg-[var(--terra-tint)]"
          : "hover:text-[var(--ink)] hover:bg-[var(--paper-2)]"
      }`}
    >
      {children}
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
        active
          ? "bg-[var(--terra)] text-white"
          : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyHero() {
  return (
    <section className="life-card p-8 sm:p-10 relative overflow-hidden text-center">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "var(--terra)" }}
      />
      <div
        className="mx-auto mb-4 grid place-items-center w-[58px] h-[58px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Target size={24} strokeWidth={1.6} />
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
        What are you aiming at?
      </h2>
      <p className="mt-2 text-[14px] text-[var(--muted)] max-w-md mx-auto leading-relaxed">
        Set a goal, tie it to the person you&apos;re becoming, and track it with
        a slider, a number, or milestones. Life OS rolls up the progress so you
        always know where you stand.
      </p>
      <div className="mt-6 flex justify-center">
        <NewGoalButton />
      </div>
    </section>
  );
}
