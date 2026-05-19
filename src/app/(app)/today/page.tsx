import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, gte, desc, sql } from "drizzle-orm";
import { getViewerId, safeQuery } from "@/lib/viewer";
import { DEMO_ITEMS, DEMO_RECENT_24H } from "@/lib/demo-data";
import { Brief } from "./brief";
import { JournalForm } from "./journal-form";
import { QuickDecision } from "./quick-decision";
import { TodayHero } from "./hero";
import { WeekStrip } from "./week-strip";
import { OnThisDay } from "./on-this-day";
import { EveningReflection } from "./evening-reflection";
import { SrsHighlight } from "./srs-highlight";
import { WhatNow } from "./what-now";
import Link from "next/link";
import { ListTodo, Flame, Lightbulb } from "lucide-react";

export const metadata = { title: "Today · Life OS" };
export const dynamic = "force-dynamic";

function pickQuote(): string {
  const highlights = DEMO_ITEMS.filter((i) => i.kind === "highlight");
  if (highlights.length === 0) return "";
  const today = new Date().getDate();
  return highlights[today % highlights.length].body ?? "";
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
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

export default async function TodayPage() {
  const userId = await getViewerId();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let recent = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), gte(items.capturedAt, oneDayAgo)))
        .orderBy(desc(items.capturedAt))
        .limit(20),
    [],
  );
  let isDemo = recent.length === 0;
  if (isDemo) recent = DEMO_RECENT_24H;

  const dueDecisions = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            eq(items.kind, "decision"),
            sql`(${items.metadata} ->> 'reviewAt')::timestamptz <= now()`,
            sql`(${items.metadata} ->> 'outcome') = 'pending'`,
          ),
        )
        .limit(10),
    [],
  );
  const decisionsForToday = isDemo
    ? DEMO_ITEMS.filter((i) => {
        if (i.kind !== "decision") return false;
        const m = (i.metadata ?? {}) as { reviewAt?: string; outcome?: string };
        if ((m.outcome ?? "pending") !== "pending") return false;
        return m.reviewAt ? new Date(m.reviewAt) <= new Date() : false;
      })
    : dueDecisions;

  const journalRows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            eq(items.kind, "journal"),
            gte(items.capturedAt, todayStart),
          ),
        )
        .orderBy(desc(items.capturedAt))
        .limit(1),
    [],
  );
  let journalToday: (typeof journalRows)[number] | null = journalRows[0] ?? null;
  if (!journalToday && isDemo) {
    journalToday =
      DEMO_ITEMS.find(
        (i) => i.kind === "journal" && new Date(i.capturedAt) >= todayStart,
      ) ?? null;
  }

  const allTasks = isDemo
    ? DEMO_ITEMS.filter((i) => i.kind === "task")
    : await safeQuery(
        () =>
          db
            .select()
            .from(items)
            .where(and(eq(items.userId, userId), eq(items.kind, "task")))
            .limit(40),
        [],
      );
  const openTasks = allTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return !m.completedAt;
  });

  const habits = isDemo
    ? DEMO_ITEMS.filter((i) => i.kind === "habit")
    : await safeQuery(
        () =>
          db
            .select()
            .from(items)
            .where(and(eq(items.userId, userId), eq(items.kind, "habit")))
            .limit(20),
        [],
      );
  const today = new Date().toISOString().slice(0, 10);
  const habitsDoneToday = habits.filter((h) =>
    ((h.metadata ?? {}) as { checkins?: string[] }).checkins?.includes(today),
  ).length;
  const bestStreak = Math.max(
    0,
    ...habits.map((h) =>
      calcStreak(new Set(((h.metadata ?? {}) as { checkins?: string[] }).checkins ?? [])),
    ),
  );

  // Last 7 days capture counts (Mon→Sun, ending today) for the hero sparkline
  const allForWeek = isDemo
    ? DEMO_ITEMS
    : await safeQuery(
        () =>
          db
            .select({ capturedAt: items.capturedAt })
            .from(items)
            .where(eq(items.userId, userId))
            .limit(2000),
        [] as Array<{ capturedAt: Date }>,
      );
  const weekCounts = (() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    // start from 6 days ago
    const counts = new Array(7).fill(0);
    for (const it of allForWeek) {
      const d = new Date(it.capturedAt);
      d.setHours(0, 0, 0, 0);
      const diff = Math.floor((todayDate.getTime() - d.getTime()) / 86_400_000);
      if (diff >= 0 && diff < 7) counts[6 - diff]++;
    }
    return counts;
  })();

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto life-stagger">
      <TodayHero
        openTaskCount={openTasks.length}
        habitsDoneToday={habitsDoneToday}
        habitTotal={habits.length}
        streak={bestStreak}
        quote={isDemo ? pickQuote() : undefined}
        weekCounts={weekCounts}
      />

      <WeekStrip />

      <WhatNow tasks={allTasks} habits={habits} decisions={decisionsForToday} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="space-y-4">
          <Brief recentCount={recent.length} />
          <JournalForm existing={journalToday} />
          <EveningReflection />
          <SrsHighlight
            pool={(isDemo ? DEMO_ITEMS : []).filter(
              (i) =>
                i.kind === "highlight" &&
                Date.now() - new Date(i.capturedAt).getTime() > 7 * 86_400_000,
            )}
          />
          <OnThisDay items={isDemo ? DEMO_ITEMS : []} />
        </div>
        <div className="space-y-4">
          <Card icon={ListTodo} title="Top tasks" href="/tasks">
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

          <Card icon={Flame} title="Habits to check" href="/habits">
            {habits.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">No habits yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {habits.slice(0, 4).map((h) => {
                  const m = (h.metadata ?? {}) as { checkins?: string[] };
                  const done = m.checkins?.includes(today);
                  return (
                    <li
                      key={h.id}
                      className="flex items-center gap-2.5 text-sm"
                    >
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

          <Card icon={Lightbulb} title="Decisions due" href="/decisions">
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
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  children: React.ReactNode;
}) {
  const head = (
    <h2 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
      <Icon size={11} />
      {title}
    </h2>
  );
  return (
    <div className="life-card p-4">
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

