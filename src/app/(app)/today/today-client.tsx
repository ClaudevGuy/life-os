"use client";

import Link from "next/link";
import { ListTodo, Flame, Lightbulb, CalendarDays, Bell } from "lucide-react";
import {
  useRecentItems,
  useItemsOfKind,
  useJournalToday,
  useDecisionsDue,
  useOldHighlights,
  useOnThisDay,
  useWeekCounts,
  useAllItems,
} from "@/lib/store/items";
import { Brief } from "./brief";
import { JournalForm } from "./journal-form";
import { QuickDecision } from "./quick-decision";
import { TodayHero } from "./hero";
import { WeekStrip } from "./week-strip";
import { OnThisDay } from "./on-this-day";
import { EveningReflection } from "./evening-reflection";
import { SrsHighlight } from "./srs-highlight";
import { WhatNow } from "./what-now";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function relDay(when: Date, startOfToday: Date) {
  const day = new Date(when);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (day.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tmrw";
  return when.toLocaleDateString(undefined, { weekday: "short" });
}

function calcStreak(checkins: Set<string>) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = ymd(new Date(Date.now() - i * 86_400_000));
    if (checkins.has(d)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

export function TodayClient() {
  const recent = useRecentItems(24) ?? [];
  const decisionsForToday = useDecisionsDue() ?? [];
  const journalToday = useJournalToday() ?? null;
  const allTasks = useItemsOfKind("task") ?? [];
  const habits = useItemsOfKind("habit") ?? [];
  const oldHighlights = useOldHighlights() ?? [];
  const onThisDayRows = useOnThisDay() ?? [];
  const weekCounts = useWeekCounts(7) ?? new Array(7).fill(0);
  const allItems = useAllItems() ?? [];

  // Upcoming agenda for the next 7 days: any task/decision with a date, plus
  // reminders. Today first, then chronological.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWindow = new Date(startOfToday);
  endOfWindow.setDate(endOfWindow.getDate() + 7);

  type Upcoming = {
    id: string;
    title: string;
    kind: string;
    isReminder: boolean;
    when: Date;
  };
  const upcoming: Upcoming[] = [];
  for (const r of allItems) {
    const meta = (r.metadata ?? {}) as {
      dueDate?: string;
      reviewAt?: string;
      reminder?: boolean;
      completedAt?: string | null;
      outcome?: string;
    };
    let when: Date | null = null;
    if (r.kind === "task" && meta.dueDate && !meta.completedAt) {
      when = new Date(meta.dueDate);
    } else if (
      r.kind === "decision" &&
      meta.reviewAt &&
      (meta.outcome ?? "pending") === "pending"
    ) {
      when = new Date(meta.reviewAt);
    }
    if (!when) continue;
    if (when < startOfToday || when >= endOfWindow) continue;
    upcoming.push({
      id: r.id,
      title: r.title ?? "untitled",
      kind: r.kind,
      isReminder: r.kind === "task" && meta.reminder === true,
      when,
    });
  }
  upcoming.sort((a, b) => a.when.getTime() - b.when.getTime());

  // Top-tasks list needs decisions of any state, but the dashboard card here
  // shows only open ones. Same shape as the old query.
  const openTasks = allTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return !m.completedAt;
  });

  const today = new Date().toISOString().slice(0, 10);
  const habitsDoneToday = habits.filter((h) =>
    ((h.metadata ?? {}) as { checkins?: string[] }).checkins?.includes(today),
  ).length;
  const bestStreak = Math.max(
    0,
    ...habits.map((h) =>
      calcStreak(
        new Set(((h.metadata ?? {}) as { checkins?: string[] }).checkins ?? []),
      ),
    ),
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto life-stagger space-y-6">
      <TodayHero
        openTaskCount={openTasks.length}
        habitsDoneToday={habitsDoneToday}
        habitTotal={habits.length}
        streak={bestStreak}
        weekCounts={weekCounts}
      />

      <WeekStrip />

      <WhatNow tasks={allTasks} habits={habits} decisions={decisionsForToday} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="space-y-5">
          <Brief recentCount={recent.length} />
          <JournalForm existing={journalToday} />
          <EveningReflection />
          <SrsHighlight pool={oldHighlights} />
          <OnThisDay items={onThisDayRows} />
        </div>
        <div className="space-y-5">
          <Card
            icon={CalendarDays}
            title="Next 7 days"
            href="/calendar"
            tint="var(--accent)"
          >
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">Clear week.</p>
            ) : (
              <ul className="space-y-1.5">
                {upcoming.slice(0, 6).map((u) => (
                  <li key={u.id} className="flex items-center gap-2.5">
                    <span className="text-[10px] uppercase tracking-wide tabular-nums text-[var(--text-faint)] w-10 shrink-0">
                      {relDay(u.when, startOfToday)}
                    </span>
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: `var(--kind-${u.kind})` }}
                    />
                    <Link
                      href={`/items/${u.id}`}
                      className="text-sm text-[var(--text)] hover:text-[var(--accent)] truncate flex-1"
                    >
                      {u.title}
                    </Link>
                    {u.isReminder && (
                      <Bell size={10} className="text-[var(--accent)] shrink-0" />
                    )}
                  </li>
                ))}
                {upcoming.length > 6 && (
                  <li className="text-[11px] text-[var(--text-faint)] pl-[3.25rem]">
                    +{upcoming.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </Card>

          <Card icon={ListTodo} title="Top tasks" href="/tasks" tint="var(--kind-task)">
            {openTasks.slice(0, 5).length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">Nothing pressing.</p>
            ) : (
              <ul className="space-y-1.5">
                {openTasks.slice(0, 5).map((t) => {
                  const m = (t.metadata ?? {}) as { priority?: string };
                  return (
                    <li key={t.id} className="flex items-start gap-2.5">
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background:
                            m.priority === "high"
                              ? "#ef8b8b"
                              : m.priority === "medium"
                              ? "var(--accent)"
                              : "#6dc8a1",
                        }}
                      />
                      <Link
                        href={`/items/${t.id}`}
                        className="text-sm text-[var(--text)] hover:text-[var(--accent)] truncate"
                      >
                        {t.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card icon={Flame} title="Habits to check" href="/habits" tint="var(--kind-habit)">
            {habits.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">No habits yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {habits.slice(0, 4).map((h) => {
                  const m = (h.metadata ?? {}) as { checkins?: string[] };
                  const done = m.checkins?.includes(today);
                  return (
                    <li key={h.id} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={`w-3 h-3 rounded-sm border ${
                          done
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--border-strong)]"
                        }`}
                      />
                      <span
                        className={
                          done
                            ? "text-[var(--text-faint)] line-through"
                            : "text-[var(--text)]"
                        }
                      >
                        {h.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card icon={Lightbulb} title="Decisions due" href="/decisions" tint="var(--kind-decision)">
            {decisionsForToday.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">Nothing waiting.</p>
            ) : (
              <ul className="space-y-1.5">
                {decisionsForToday.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/items/${d.id}`}
                      className="text-sm hover:text-[var(--accent)]"
                    >
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <QuickDecision />
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  href,
  tint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  href?: string;
  tint?: string;
  children: React.ReactNode;
}) {
  const head = (
    <h2 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
      <Icon size={11} style={tint ? { color: tint } : undefined} />
      {title}
    </h2>
  );
  return (
    <div className="life-card p-4 relative overflow-hidden">
      {tint && (
        <div
          className="absolute -top-px left-0 right-0 h-px pointer-events-none"
          style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
        />
      )}
      <div className="mb-3 flex items-center justify-between">
        {head}
        {href && (
          <Link
            href={href}
            className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] hover:text-[var(--accent)]"
          >
            view →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
