"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import {
  Inbox,
  Sun,
  NotebookPen,
  ListTodo,
  Flame,
  Target,
  Users,
  Lightbulb,
  Clock,
  BarChart3,
  CalendarDays,
  MessageSquare,
  FolderKanban,
  BookHeart,
  Files,
} from "lucide-react";

type RailIcon = React.ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;

type BadgeKey =
  | "openTasks"
  | "overdueTasks"
  | "dueToday"
  | "pendingDecisions"
  | "inboxCount";

type RailItem = {
  href: string;
  label: string;
  icon: RailIcon;
  badgeKey?: BadgeKey;
  alertWhen?: BadgeKey;
};

type RailSection = { heading: string; items: RailItem[] };

const SECTIONS: RailSection[] = [
  {
    heading: "Capture",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "inboxCount" },
      { href: "/notes", label: "Notes", icon: NotebookPen },
      { href: "/files", label: "Files", icon: Files },
    ],
  },
  {
    heading: "Daily",
    items: [
      { href: "/today", label: "Today", icon: Sun },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      {
        href: "/tasks",
        label: "Tasks",
        icon: ListTodo,
        badgeKey: "openTasks",
        alertWhen: "overdueTasks",
      },
      { href: "/habits", label: "Habits", icon: Flame },
    ],
  },
  {
    heading: "Reflect",
    items: [
      { href: "/journal", label: "Journal", icon: BookHeart },
      { href: "/projects", label: "Projects & Areas", icon: FolderKanban },
      { href: "/goals", label: "Goals", icon: Target },
      {
        href: "/decisions",
        label: "Decisions",
        icon: Lightbulb,
        badgeKey: "pendingDecisions",
      },
      { href: "/people", label: "People", icon: Users },
    ],
  },
  {
    heading: "Explore",
    items: [
      { href: "/ask", label: "Ask my notes", icon: MessageSquare },
      { href: "/timeline", label: "Timeline", icon: Clock },
      { href: "/stats", label: "Stats", icon: BarChart3 },
    ],
  },
];

type Stats = {
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  pendingDecisions: number;
  inboxCount: number;
};

const EMPTY: Stats = {
  openTasks: 0,
  overdueTasks: 0,
  dueToday: 0,
  pendingDecisions: 0,
  inboxCount: 0,
};

export function SidebarNav() {
  const pathname = usePathname();
  const stats =
    useLiveQuery(async () => computeStats(await db.items.toArray())) ?? EMPTY;

  return (
    <>
      {SECTIONS.map((section) => (
        <div key={section.heading} className="mt-4 first:mt-0">
          <div
            className="px-2.5 mb-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--text-faint)]"
            data-rail-section
          >
            {section.heading}
          </div>
          <div className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon, badgeKey, alertWhen }) => {
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href + "/"));
              const badge = badgeKey ? stats[badgeKey] : 0;
              const alert = alertWhen ? stats[alertWhen] > 0 : false;

              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    active
                      ? "text-[var(--text)] bg-[var(--bg-card-hover)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  <Icon
                    size={14}
                    strokeWidth={active ? 2.25 : 2}
                    className={`shrink-0 transition ${
                      active ? "text-[var(--accent)]" : "text-[var(--text-faint)]"
                    }`}
                  />
                  <span data-rail-text className="flex-1 truncate">
                    {label}
                  </span>
                  {badge > 0 && (
                    <span
                      data-rail-text
                      className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                        alert
                          ? "bg-red-500/15 text-red-300"
                          : active
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--bg-card)] text-[var(--text-faint)] group-hover:text-[var(--text-muted)]"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
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
  const now = new Date();

  let openTasks = 0;
  let overdueTasks = 0;
  let dueToday = 0;
  let pendingDecisions = 0;
  let inboxCount = 0;

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

    if (r.kind === "decision") {
      const outcome = (meta.outcome as string | undefined) ?? "pending";
      const reviewAt = meta.reviewAt as string | undefined;
      if (outcome === "pending" && reviewAt && new Date(reviewAt) <= now) {
        pendingDecisions++;
      }
    }
  }

  return {
    openTasks,
    overdueTasks,
    dueToday,
    pendingDecisions,
    inboxCount,
  };
}
