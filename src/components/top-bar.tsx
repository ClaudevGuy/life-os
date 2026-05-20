"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Inbox,
  Flame,
  ListTodo,
  Bookmark,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SearchTrigger } from "@/components/search-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { PomodoroPill } from "@/components/pomodoro-pill";

type Stats = {
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  toRead: number;
  pendingDecisions: number;
  habitsDone: number;
  habitsTotal: number;
  inboxCount: number;
  bestStreak: number;
};

const EMPTY: Stats = {
  openTasks: 0,
  overdueTasks: 0,
  dueToday: 0,
  toRead: 0,
  pendingDecisions: 0,
  habitsDone: 0,
  habitsTotal: 0,
  inboxCount: 0,
  bestStreak: 0,
};

export function TopBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats = useLiveQuery(async () => computeStats(await db.items.toArray())) ?? EMPTY;

  const timeLabel = now
    ? now.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const dateLabel = now
    ? now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="sticky top-0 z-10 pl-3 sm:pl-6 pr-3 py-2 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/85 backdrop-blur flex items-center gap-2 sm:gap-3">
      <SidebarToggle />

      {/* Search — flexes */}
      <div className="flex-1 min-w-0 max-w-2xl">
        <SearchTrigger />
      </div>

      {/* Live pills — `ml-auto` absorbs all remaining horizontal space so the
          pills + the right cluster after them sit flush against the corner. */}
      <div className="ml-auto hidden md:flex items-center gap-1.5">
        {stats.overdueTasks > 0 && (
          <Pill
            href="/tasks"
            tone="warn"
            icon={AlertCircle}
            label={`${stats.overdueTasks} overdue`}
            title="Overdue tasks"
          />
        )}
        {stats.dueToday > 0 && (
          <Pill
            href="/tasks"
            tone="accent"
            icon={ListTodo}
            label={`${stats.dueToday} due today`}
            title="Tasks due today"
          />
        )}
        {stats.pendingDecisions > 0 && (
          <Pill
            href="/decisions"
            tone="accent"
            icon={Lightbulb}
            label={`${stats.pendingDecisions} to review`}
            title="Decisions due for review"
          />
        )}
        {stats.inboxCount > 0 && (
          <Pill
            href="/inbox"
            tone="default"
            icon={Inbox}
            label={`${stats.inboxCount}`}
            title={`${stats.inboxCount} in inbox`}
          />
        )}
        {stats.toRead > 0 && (
          <Pill
            href="/inbox"
            tone="default"
            icon={Bookmark}
            label={`${stats.toRead}`}
            title={`${stats.toRead} to read`}
          />
        )}
        {stats.habitsTotal > 0 && (
          <Pill
            href="/habits"
            tone={stats.bestStreak > 2 ? "fire" : "default"}
            icon={Flame}
            label={`${stats.habitsDone}/${stats.habitsTotal}${
              stats.bestStreak > 0 ? ` · ${stats.bestStreak}🔥` : ""
            }`}
            title="Today's habits"
          />
        )}
      </div>

      {/* Right: quick ask + theme toggle + clock — all anchored to the corner,
          unified height (30px) so they read as one row of controls.
          ml-auto on small screens (when live pills are hidden) so it still
          hugs the edge. md:ml-0 hands the auto margin off to live pills. */}
      <div className="ml-auto md:ml-0 flex items-center gap-2 shrink-0">
        <Link
          href="/ask"
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] text-xs text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition shadow-sm"
          title="Ask my notes"
        >
          <Sparkles size={12} />
          Ask
        </Link>
        <PomodoroPill />
        <ThemeToggle />
        {now && (
          <div className="hidden sm:flex flex-col items-end justify-center h-[30px] px-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] leading-none shadow-sm">
            <span className="text-[11px] tabular-nums text-[var(--text)] font-mono">
              {timeLabel}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--text-faint)]">
              {dateLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({
  href,
  icon: Icon,
  label,
  tone,
  title,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone: "default" | "warn" | "accent" | "fire";
  title: string;
}) {
  const toneClass =
    tone === "warn"
      ? "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/40 hover:bg-red-500/20"
      : tone === "accent"
      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/40 hover:brightness-105"
      : tone === "fire"
      ? "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/40 hover:bg-orange-500/20"
      : "bg-[var(--bg-card)] text-[var(--text)] border-[var(--border-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] tabular-nums transition whitespace-nowrap shadow-sm ${toneClass}`}
    >
      <Icon size={11} />
      {label}
    </Link>
  );
}

function computeStats(rows: Array<{
  kind: string;
  status: string;
  metadata: Record<string, unknown>;
}>): Stats {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const today = startOfToday.toISOString().slice(0, 10);

  let openTasks = 0;
  let overdueTasks = 0;
  let dueToday = 0;
  let toRead = 0;
  let pendingDecisions = 0;
  let habitsDone = 0;
  let habitsTotal = 0;
  let inboxCount = 0;
  let bestStreak = 0;

  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;

    if (r.status === "inbox") inboxCount++;

    if (r.kind === "task") {
      const completed = meta.completedAt as string | null | undefined;
      if (!completed && r.status !== "archived") {
        openTasks++;
        const due = meta.dueDate as string | undefined;
        if (due) {
          const d = new Date(due);
          if (d < startOfToday) overdueTasks++;
          else if (d >= startOfToday && d < endOfToday) dueToday++;
        }
      }
    }

    if (r.kind === "bookmark") {
      const state = meta.readState as string | undefined;
      if (!state || state === "to-read") toRead++;
    }

    if (r.kind === "decision") {
      const outcome = (meta.outcome as string | undefined) ?? "pending";
      const reviewAt = meta.reviewAt as string | undefined;
      if (outcome === "pending" && reviewAt && new Date(reviewAt) <= new Date()) {
        pendingDecisions++;
      }
    }

    if (r.kind === "habit") {
      habitsTotal++;
      const checkins = (meta.checkins as string[] | undefined) ?? [];
      if (checkins.includes(today)) habitsDone++;
      let streak = 0;
      const set = new Set(checkins);
      for (let i = 0; i < 365; i++) {
        const d = new Date(Date.now() - i * 86_400_000)
          .toISOString()
          .slice(0, 10);
        if (set.has(d)) streak++;
        else if (i === 0) continue;
        else break;
      }
      if (streak > bestStreak) bestStreak = streak;
    }
  }

  return {
    openTasks,
    overdueTasks,
    dueToday,
    toRead,
    pendingDecisions,
    habitsDone,
    habitsTotal,
    inboxCount,
    bestStreak,
  };
}
