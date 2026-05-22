"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { isPending, type Cadence } from "@/lib/habits";
import {
  Inbox,
  Sun,
  NotebookPen,
  ListTodo,
  Flame,
  Users,
  BarChart3,
  CalendarDays,
  MessageSquare,
  FolderKanban,
  BookHeart,
  Files,
  CreditCard,
  Bookmark,
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
  | "inboxCount"
  | "habitsPending"
  | "renewingSoon";

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
      { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
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
      {
        href: "/habits",
        label: "Habits",
        icon: Flame,
        badgeKey: "habitsPending",
      },
    ],
  },
  {
    heading: "Reflect",
    items: [
      { href: "/journal", label: "Journal", icon: BookHeart },
      { href: "/projects", label: "Projects & Areas", icon: FolderKanban },
      { href: "/people", label: "People", icon: Users },
      {
        href: "/subscriptions",
        label: "Subscriptions",
        icon: CreditCard,
        badgeKey: "renewingSoon",
      },
    ],
  },
  {
    heading: "Explore",
    items: [
      { href: "/ask", label: "Ask my notes", icon: MessageSquare },
      { href: "/stats", label: "Stats", icon: BarChart3 },
    ],
  },
];

type Stats = {
  openTasks: number;
  overdueTasks: number;
  dueToday: number;
  inboxCount: number;
  habitsPending: number;
  renewingSoon: number;
};

const EMPTY: Stats = {
  openTasks: 0,
  overdueTasks: 0,
  dueToday: 0,
  inboxCount: 0,
  habitsPending: 0,
  renewingSoon: 0,
};

export function SidebarNav() {
  const pathname = usePathname();
  const stats =
    useLiveQuery(async () => computeStats(await db.items.toArray())) ?? EMPTY;

  return (
    <>
      {SECTIONS.map((section, gi) => (
        <div key={section.heading} className={gi === 0 ? "mt-[10px]" : "mt-[18px]"}>
          <div
            className="px-[10px] pb-2 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]"
            data-rail-section
          >
            {section.heading}
          </div>
          <div className="flex flex-col gap-[2px]">
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
                  className={`group relative flex items-center gap-[10px] px-[10px] py-2 rounded-[9px] text-[13.5px] transition-colors ${
                    active
                      ? "text-[var(--ink)] bg-[var(--paper-2)] font-medium"
                      : "text-[var(--ink-2)] hover:bg-[var(--bg-2)] font-normal"
                  }`}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.6}
                    className={`shrink-0 transition ${
                      active ? "text-[var(--terra)]" : "text-[var(--muted)]"
                    }`}
                  />
                  <span data-rail-text className="flex-1 truncate">
                    {label}
                  </span>
                  {badge > 0 && (
                    <span
                      data-rail-text
                      className={`tabular-nums text-[10.5px] font-mono px-1.5 py-[2px] rounded-full ${
                        alert
                          ? "bg-[var(--bad)] text-[var(--paper)]"
                          : active
                          ? "bg-[var(--terra)] text-[var(--paper)]"
                          : "bg-[var(--bg-2)] text-[var(--muted)]"
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

  let openTasks = 0;
  let overdueTasks = 0;
  let dueToday = 0;
  let inboxCount = 0;
  let habitsPending = 0;
  let renewingSoon = 0;
  const cutoffRenew = Date.now() + 7 * 86_400_000;

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

    if (r.kind === "habit" && r.status !== "archived") {
      const checkins = (meta.checkins as string[] | undefined) ?? [];
      const cadence = (meta.cadence as Cadence | undefined) ?? "daily";
      if (isPending(checkins, cadence)) habitsPending++;
    }

    if (r.kind === "subscription" && r.status !== "archived") {
      const nextCharge = meta.nextChargeAt as string | undefined;
      if (nextCharge) {
        const t = new Date(nextCharge).getTime();
        if (t <= cutoffRenew) renewingSoon++;
      }
    }
  }

  return {
    openTasks,
    overdueTasks,
    dueToday,
    inboxCount,
    habitsPending,
    renewingSoon,
  };
}
