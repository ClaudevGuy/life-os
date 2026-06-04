"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Inbox,
  Flame,
  ListTodo,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SearchTrigger } from "@/components/search-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { PomodoroPill } from "@/components/pomodoro-pill";
import { AskPopover } from "@/components/ask-popover";
import { ymd } from "@/lib/ymd";

type Stats = {
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  habitsDone: number;
  habitsTotal: number;
  inboxCount: number;
  bestStreak: number;
};

const EMPTY: Stats = {
  openTasks: 0,
  overdueTasks: 0,
  dueToday: 0,
  habitsDone: 0,
  habitsTotal: 0,
  inboxCount: 0,
  bestStreak: 0,
};

export function TopBar() {
  const [askOpen, setAskOpen] = useState(false);

  const stats = useLiveQuery(async () => computeStats(await db.items.toArray())) ?? EMPTY;

  return (
    <div className="sticky top-0 z-10 pl-3 sm:pl-[22px] pr-[14px] py-[14px] border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur flex items-center gap-2 sm:gap-[10px]">
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
        {stats.inboxCount > 0 && (
          <Pill
            href="/inbox"
            tone="default"
            icon={Inbox}
            label={`${stats.inboxCount}`}
            title={`${stats.inboxCount} in inbox`}
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
        <button
          type="button"
          onClick={() => setAskOpen(true)}
          className="focus-hide inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] text-[13px] font-medium leading-none text-[var(--ink)] hover:text-[var(--terra)] hover:border-[var(--terra)] hover:-translate-y-px hover:shadow-[0_2px_10px_var(--accent-glow)] active:translate-y-0 transition"
          title="Ask my notes"
        >
          <Sparkles
            size={13}
            className="text-[var(--terra)] tb-twinkle"
            strokeWidth={1.6}
          />
          <span
            className="text-[13px] font-medium leading-none"
            style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
          >
            Ask
          </span>
        </button>
        <PomodoroPill />
        <ThemeToggle />
        <LiveClock />
      </div>

      <AskPopover open={askOpen} onClose={() => setAskOpen(false)} />
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
      ? "bg-[var(--terra-tint)] text-[var(--bad)] border-[var(--bad)]/30 hover:brightness-[0.98]"
      : tone === "accent"
      ? "bg-[var(--terra-tint)] text-[var(--terra)] border-[var(--terra)]/30 hover:brightness-[0.98]"
      : tone === "fire"
      ? "bg-[var(--gold-tint)] text-[var(--gold)] border-[var(--gold)]/30 hover:brightness-[0.98]"
      : "bg-[var(--paper)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--terra)] hover:text-[var(--terra)]";

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 h-[30px] text-[11.5px] font-medium tabular-nums transition hover:-translate-y-px active:translate-y-0 whitespace-nowrap ${toneClass}`}
    >
      <Icon size={12} />
      {label}
    </Link>
  );
}

/**
 * A self-contained live clock: ticks every second (so the colon can blink and
 * the time stays honest) without re-rendering the rest of the bar. The glyph
 * tracks the real time of day — sunrise, sun, sunset, moon.
 */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return (
      <div className="hidden sm:block w-[96px] h-[30px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)]" />
    );
  }

  const h = now.getHours();
  const m = now.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = String(m).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const Glyph =
    h < 6 ? Moon : h < 8 ? Sunrise : h < 18 ? Sun : h < 21 ? Sunset : Moon;
  const glyphColor =
    h < 6 || h >= 21
      ? "#8FA6C8"
      : h < 8
        ? "#E59A6B"
        : h < 18
          ? "#E0A94A"
          : "#D9764F";

  return (
    <div className="hidden sm:flex items-center gap-2 h-[30px] pl-2.5 pr-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--terra)]/40 transition-colors">
      <Glyph
        size={13}
        strokeWidth={1.7}
        style={{ color: glyphColor }}
        className="shrink-0"
      />
      <div className="flex flex-col items-end justify-center leading-none">
        <span className="text-[11.5px] tabular-nums text-[var(--ink)] font-mono tracking-[0.03em]">
          {hh}
          <span className="tb-colon">:</span>
          {mm}
          <span className="ml-1 text-[9px] text-[var(--muted)]">{ampm}</span>
        </span>
        <span className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
          {dateLabel}
        </span>
      </div>
    </div>
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
  const today = ymd(startOfToday);

  let openTasks = 0;
  let overdueTasks = 0;
  let dueToday = 0;
  let habitsDone = 0;
  let habitsTotal = 0;
  let inboxCount = 0;
  let bestStreak = 0;

  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;

    if (r.status === "inbox") inboxCount++;

    if (r.kind === "task" && meta.reminder !== true) {
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

    if (r.kind === "habit") {
      habitsTotal++;
      const checkins = (meta.checkins as string[] | undefined) ?? [];
      if (checkins.includes(today)) habitsDone++;
      let streak = 0;
      const set = new Set(checkins);
      for (let i = 0; i < 365; i++) {
        const d = ymd(new Date(Date.now() - i * 86_400_000));
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
    habitsDone,
    habitsTotal,
    inboxCount,
    bestStreak,
  };
}
