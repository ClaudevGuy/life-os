"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Network,
  Tag,
  BarChart3,
  Sparkles,
  LayoutTemplate,
  CalendarDays,
  MessageSquare,
  FolderKanban,
  BookOpen,
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
  | "toRead"
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
      { href: "/highlights", label: "Highlights", icon: Sparkles },
      { href: "/reading", label: "Reading", icon: BookOpen, badgeKey: "toRead" },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
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
    heading: "Think",
    items: [
      { href: "/ask", label: "Ask my notes", icon: MessageSquare },
      { href: "/projects", label: "Projects & Areas", icon: FolderKanban },
    ],
  },
  {
    heading: "Reflect",
    items: [
      { href: "/journal", label: "Journal", icon: NotebookPen },
      { href: "/goals", label: "Goals", icon: Target },
      {
        href: "/decisions",
        label: "Decisions",
        icon: Lightbulb,
        badgeKey: "pendingDecisions",
      },
      { href: "/people", label: "People", icon: Users },
      { href: "/reviews", label: "Reviews", icon: Sparkles },
    ],
  },
  {
    heading: "Explore",
    items: [
      { href: "/timeline", label: "Timeline", icon: Clock },
      { href: "/graph", label: "Graph", icon: Network },
      { href: "/tags", label: "Tags", icon: Tag },
      { href: "/stats", label: "Stats", icon: BarChart3 },
    ],
  },
];

type Stats = {
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  toRead: number;
  pendingDecisions: number;
  inboxCount: number;
};

const EMPTY: Stats = {
  openTasks: 0,
  overdueTasks: 0,
  dueToday: 0,
  toRead: 0,
  pendingDecisions: 0,
  inboxCount: 0,
};

export function SidebarNav() {
  const pathname = usePathname();
  const [stats, setStats] = useState<Stats>(EMPTY);

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
