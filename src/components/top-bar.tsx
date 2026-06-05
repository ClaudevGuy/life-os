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
import { VoiceButton } from "@/components/voice-capture";
import { greetingFor, timeOfDay } from "@/lib/time-of-day";
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
    <div
      className="sticky top-0 z-10 pl-3 sm:pl-[22px] pr-[14px] py-[14px] border-b border-[var(--line)] backdrop-blur flex items-center gap-2 sm:gap-[10px]"
      style={{
        background:
          "linear-gradient(100deg, color-mix(in oklch, var(--terra) 7%, transparent) 0%, transparent 26%, transparent 74%, color-mix(in oklch, var(--gold) 6%, transparent) 100%), color-mix(in oklch, var(--paper) 86%, transparent)",
      }}
    >
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
          <HabitsPill
            done={stats.habitsDone}
            total={stats.habitsTotal}
            streak={stats.bestStreak}
          />
        )}
      </div>

      {/* Right: quick ask + theme toggle + clock — all anchored to the corner,
          unified height (30px) so they read as one row of controls.
          ml-auto on small screens (when live pills are hidden) so it still
          hugs the edge. md:ml-0 hands the auto margin off to live pills. */}
      <div className="ml-auto md:ml-0 flex items-center gap-2 shrink-0">
        <VoiceButton />
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

/** Habits pill with a little completion ring + a flame for the streak. */
function HabitsPill({
  done,
  total,
  streak,
}: {
  done: number;
  total: number;
  streak: number;
}) {
  const allDone = total > 0 && done >= total;
  const ringColor = allDone ? "var(--gold)" : "var(--terra)";
  const tone =
    allDone || streak > 2
      ? "bg-[var(--gold-tint)] text-[var(--gold)] border-[var(--gold)]/30"
      : "bg-[var(--paper)] text-[var(--ink-2)] border-[var(--line)] hover:border-[var(--terra)] hover:text-[var(--terra)]";
  return (
    <Link
      href="/habits"
      title="Today's habits"
      className={`inline-flex items-center gap-1.5 rounded-[10px] border pl-1.5 pr-2.5 h-[30px] text-[11.5px] font-medium tabular-nums transition hover:-translate-y-px active:translate-y-0 whitespace-nowrap ${tone}`}
    >
      <MiniRing done={done} total={total} color={ringColor} />
      <span>
        {done}/{total}
      </span>
      {streak > 0 && (
        <span className="inline-flex items-center gap-0.5">
          <span className="opacity-30">·</span>
          <Flame
            size={11}
            className="text-[var(--gold)]"
            fill="var(--gold)"
            strokeWidth={1.4}
          />
          {streak}
        </span>
      )}
    </Link>
  );
}

function MiniRing({
  done,
  total,
  color,
}: {
  done: number;
  total: number;
  color: string;
}) {
  const size = 16;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`color-mix(in oklch, ${color} 22%, transparent)`}
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
        strokeDashoffset={c * (1 - pct)}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
    </svg>
  );
}

/**
 * A self-contained live clock: ticks every second (so the colon can blink and
 * the time stays honest) without re-rendering the rest of the bar. The glyph
 * tracks the real time of day — sunrise, sun, sunset, moon — and hovering
 * reveals a greeting.
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
  const fullDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const greeting = greetingFor(timeOfDay(now));

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
    <div className="relative group hidden sm:block">
      <div className="flex items-center gap-2 h-[30px] pl-2.5 pr-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] group-hover:border-[var(--terra)]/40 transition-colors cursor-default">
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

      {/* Hover greeting */}
      <div
        className="pointer-events-none absolute right-0 top-full mt-2 px-3.5 py-2.5 rounded-[12px] border border-[var(--line-2)] bg-[var(--paper)] opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap z-50"
        style={{ boxShadow: "var(--shadow-2)" }}
      >
        <div
          className="text-[14px] font-semibold tracking-[-0.01em]"
          style={{
            background:
              "linear-gradient(120deg, var(--terra) 0%, var(--gold) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {greeting}
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--muted)]">{fullDate}</div>
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
