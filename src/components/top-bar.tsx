"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Inbox,
  Flame,
  ListTodo,
  Bookmark,
  Lightbulb,
  Sparkles,
  CornerDownRight,
} from "lucide-react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { SearchTrigger } from "@/components/search-trigger";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const pathname = usePathname();
  const [stats, setStats] = useState<Stats>(EMPTY);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/topbar/stats")
      .then((r) => r.json())
      .then((d: Stats) => {
        if (alive) setStats(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

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
    <div className="sticky top-0 z-10 px-3 sm:px-6 py-2 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/85 backdrop-blur flex items-center gap-2 sm:gap-3">
      <SidebarToggle />

      {/* Search — flexes */}
      <div className="flex-1 min-w-0 max-w-2xl">
        <SearchTrigger />
      </div>

      {/* Live pills */}
      <div className="hidden md:flex items-center gap-1.5">
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

      {/* Right: quick ask + theme toggle + clock */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/ask"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card-hover)] transition"
          title="Ask my notes"
        >
          <Sparkles size={11} />
          Ask
        </Link>
        <ThemeToggle />
        {now && (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-[11px] tabular-nums text-[var(--text)] font-mono">
              {timeLabel}
            </span>
            <span className="text-[9px] uppercase tracking-wide text-[var(--text-faint)]">
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
      ? "bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/15"
      : tone === "accent"
      ? "bg-[var(--accent-glow)] text-[var(--accent)] border-[var(--accent-soft)] hover:bg-[var(--accent-soft)]"
      : tone === "fire"
      ? "bg-orange-500/10 text-orange-300 border-orange-500/20 hover:bg-orange-500/15"
      : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] hover:text-[var(--text)] hover:border-[var(--border-strong)]";

  return (
    <Link
      href={href}
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] tabular-nums transition whitespace-nowrap ${toneClass}`}
    >
      <Icon size={11} />
      {label}
    </Link>
  );
}
