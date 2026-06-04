/**
 * Goals (the "Compass" layer). A goal is an item of kind="goal" with flat
 * metadata. Progress can be tracked three ways and — crucially — auto-rolls
 * from the goal's own data rather than being hand-updated:
 *
 *  • manual     — a 0–100 slider you set yourself
 *  • number     — current / target with a unit ("Save $10,000")
 *  • milestones — an in-goal checklist; progress = done / total
 */
import type { StoredItem } from "@/lib/store/db";

export type Timeframe = "month" | "quarter" | "year" | "someday";
export type Metric = "manual" | "number" | "milestones";

export type Milestone = { id: string; text: string; done: boolean };

export type GoalMeta = {
  timeframe: Timeframe;
  category: string;
  metric: Metric;
  progress?: number; // manual, 0–100
  current?: number; // number
  target?: number; // number
  unit?: string; // number, e.g. "$", "kg", "books"
  milestones?: Milestone[];
  targetDate?: string; // ISO date (optional deadline)
  identity?: string; // "I am someone who…"
  achievedAt?: string | null;
};

export const TIMEFRAMES: Timeframe[] = ["month", "quarter", "year", "someday"];

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  someday: "Someday",
};

export const TIMEFRAME_BADGE: Record<Timeframe, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  someday: "Someday",
};

/** Life areas. Colors are Studio tokens so they adapt to light/dark. */
export const CATEGORIES = [
  "Health",
  "Career",
  "Money",
  "Relationships",
  "Growth",
  "Mind",
  "Fun",
  "Home",
] as const;

export const CATEGORY_COLOR: Record<string, string> = {
  Health: "var(--sage)",
  Career: "var(--sky)",
  Money: "var(--gold)",
  Relationships: "var(--plum)",
  Growth: "var(--terra)",
  Mind: "var(--sky)",
  Fun: "var(--gold)",
  Home: "var(--sage)",
};

export function categoryColor(c: string): string {
  return CATEGORY_COLOR[c] ?? "var(--terra)";
}

export function readGoal(item: StoredItem): GoalMeta {
  const m = (item.metadata ?? {}) as Partial<GoalMeta>;
  const metric: Metric =
    m.metric === "number" || m.metric === "milestones" ? m.metric : "manual";
  return {
    timeframe: TIMEFRAMES.includes(m.timeframe as Timeframe)
      ? (m.timeframe as Timeframe)
      : "year",
    category: m.category || "Growth",
    metric,
    progress: typeof m.progress === "number" ? m.progress : 0,
    current: typeof m.current === "number" ? m.current : undefined,
    target: typeof m.target === "number" ? m.target : undefined,
    unit: m.unit,
    milestones: Array.isArray(m.milestones) ? m.milestones : [],
    targetDate: m.targetDate,
    identity: m.identity,
    achievedAt: m.achievedAt ?? null,
  };
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Progress 0–100, derived from whichever metric the goal uses. */
export function goalProgress(meta: GoalMeta): number {
  if (meta.metric === "number") {
    if (!meta.target || meta.target <= 0) return 0;
    return clamp(((meta.current ?? 0) / meta.target) * 100);
  }
  if (meta.metric === "milestones") {
    const ms = meta.milestones ?? [];
    if (ms.length === 0) return 0;
    return clamp((ms.filter((m) => m.done).length / ms.length) * 100);
  }
  return clamp(meta.progress ?? 0);
}

export function isAchieved(meta: GoalMeta): boolean {
  return Boolean(meta.achievedAt) || goalProgress(meta) >= 100;
}

/**
 * Pace check for goals with a deadline: compares progress to time elapsed
 * between when the goal was created and its target date.
 *   > 0  → ahead of pace
 *   ~ 0  → on pace
 *   < 0  → behind pace
 * Returns null when there's nothing to compare against.
 */
export function paceDelta(
  meta: GoalMeta,
  createdAt: Date,
  now: Date = new Date(),
): number | null {
  if (!meta.targetDate) return null;
  const target = new Date(meta.targetDate).getTime();
  const start = createdAt.getTime();
  if (!isFinite(target) || target <= start) return null;
  const elapsed = (now.getTime() - start) / (target - start);
  const expectedPct = clamp(elapsed * 100);
  return goalProgress(meta) - expectedPct;
}

export function daysUntil(dateIso: string | undefined, now = new Date()): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - a.getTime()) / 86_400_000);
}

export function deadlineLabel(dateIso: string | undefined): string | null {
  const days = daysUntil(dateIso);
  if (days === null) return null;
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "due today";
  if (days === 1) return "1 day left";
  if (days < 30) return `${days} days left`;
  if (days < 365) return `${Math.round(days / 30)} months left`;
  return `${Math.round(days / 365)}y left`;
}

export function newMilestoneId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `m_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}
