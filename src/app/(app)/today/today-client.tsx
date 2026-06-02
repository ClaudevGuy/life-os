"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ListTodo,
  Flame,
  CalendarDays,
  Bell,
  CreditCard,
  GripVertical,
  X,
  Plus,
  SlidersHorizontal,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  useRecentItems,
  useItemsOfKind,
  useOldHighlights,
  useOnThisDay,
  useWeekCounts,
  useAllItems,
  type StoredItem as Item,
} from "@/lib/store/items";
import {
  formatMoney,
  monthlyTotals,
  nextChargeLabel,
  readSubscription,
} from "@/lib/subscriptions";
import { Brief } from "./brief";
import { TodayHero } from "./hero";
import { WeekStrip } from "./week-strip";
import { OnThisDay } from "./on-this-day";
import { SrsHighlight } from "./srs-highlight";
import { WhatNow } from "./what-now";
import { ymd } from "@/lib/ymd";

// ── Widget registry ───────────────────────────────────────────────────────

type WidgetId =
  | "whatNow"
  | "weekStrip"
  | "brief"
  | "agenda"
  | "topTasks"
  | "habits"
  | "resurface"
  | "onThisDay"
  | "subscriptions";

const WIDGET_META: Record<WidgetId, string> = {
  whatNow: "What now",
  weekStrip: "Week strip",
  brief: "Daily brief",
  agenda: "Next 7 days",
  topTasks: "Top tasks",
  habits: "Habits to check",
  resurface: "Resurfaced highlight",
  onThisDay: "On this day",
  subscriptions: "Subscriptions",
};

const ALL_IDS = Object.keys(WIDGET_META) as WidgetId[];

type Layout = { columns: [WidgetId[], WidgetId[]]; hidden: WidgetId[] };

const DEFAULT_LAYOUT: Layout = {
  columns: [
    ["whatNow", "brief", "resurface", "onThisDay"],
    ["weekStrip", "agenda", "topTasks", "habits", "subscriptions"],
  ],
  hidden: [],
};

const LS_KEY = "lifeos.today.layout.v1";

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<Layout>;
    const seen = new Set<WidgetId>();
    const clean = (arr: unknown): WidgetId[] =>
      (Array.isArray(arr) ? arr : []).filter(
        (id): id is WidgetId =>
          ALL_IDS.includes(id as WidgetId) &&
          !seen.has(id as WidgetId) &&
          (seen.add(id as WidgetId), true),
      );
    const columns: [WidgetId[], WidgetId[]] = [
      clean(parsed.columns?.[0]),
      clean(parsed.columns?.[1]),
    ];
    const hidden = clean(parsed.hidden);
    // Any new widget the saved layout doesn't know about → park in hidden.
    for (const id of ALL_IDS) if (!seen.has(id)) hidden.push(id);
    return { columns, hidden };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Page ────────────────────────────────────────────────────────────────────

export function TodayClient() {
  const recent = useRecentItems(24) ?? [];
  const allTasks = useItemsOfKind("task") ?? [];
  const subscriptions = useItemsOfKind("subscription") ?? [];
  const habits = useItemsOfKind("habit") ?? [];
  const oldHighlights = useOldHighlights() ?? [];
  const onThisDayRows = useOnThisDay() ?? [];
  const weekCounts = useWeekCounts(7) ?? new Array(7).fill(0);
  const allItems = useAllItems() ?? [];

  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [drop, setDrop] = useState<{ col: 0 | 1; before: WidgetId | null } | null>(
    null,
  );

  useEffect(() => {
    setLayout(loadLayout());
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout, mounted]);

  // ── Derived data ──
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
      reminder?: boolean;
      completedAt?: string | null;
    };
    let when: Date | null = null;
    if (r.kind === "task" && meta.dueDate && !meta.completedAt) {
      when = new Date(meta.dueDate);
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

  const openTasks = allTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return !m.completedAt;
  });

  const today = ymd();
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

  const activeSubs = subscriptions.filter((s) => s.status !== "archived");

  // Collapse widgets that would render nothing (unless arranging).
  function isEmpty(id: WidgetId): boolean {
    switch (id) {
      case "resurface":
        return oldHighlights.length === 0;
      case "onThisDay":
        return onThisDayRows.length === 0;
      case "subscriptions":
        return activeSubs.length === 0;
      default:
        return false;
    }
  }

  function renderWidget(id: WidgetId): React.ReactNode {
    switch (id) {
      case "whatNow":
        return <WhatNow tasks={allTasks} habits={habits} decisions={[]} />;
      case "weekStrip":
        return <WeekStrip />;
      case "brief":
        return <Brief recentCount={recent.length} />;
      case "resurface":
        return <SrsHighlight pool={oldHighlights} />;
      case "onThisDay":
        return <OnThisDay items={onThisDayRows} />;
      case "agenda":
        return <AgendaCard upcoming={upcoming} startOfToday={startOfToday} />;
      case "topTasks":
        return <TopTasksCard openTasks={openTasks} />;
      case "habits":
        return <HabitsCard habits={habits} today={today} />;
      case "subscriptions":
        return <SubscriptionsTile items={subscriptions} />;
    }
  }

  // ── Layout mutations ──
  function applyMove(id: WidgetId, col: 0 | 1, before: WidgetId | null) {
    setLayout((prev) => {
      const columns: [WidgetId[], WidgetId[]] = [
        prev.columns[0].filter((x) => x !== id),
        prev.columns[1].filter((x) => x !== id),
      ];
      const hidden = prev.hidden.filter((x) => x !== id);
      const target = columns[col];
      if (before == null) target.push(id);
      else {
        const i = target.indexOf(before);
        if (i === -1) target.push(id);
        else target.splice(i, 0, id);
      }
      return { columns, hidden };
    });
  }
  function hideWidget(id: WidgetId) {
    setLayout((prev) => ({
      columns: [
        prev.columns[0].filter((x) => x !== id),
        prev.columns[1].filter((x) => x !== id),
      ],
      hidden: prev.hidden.includes(id) ? prev.hidden : [...prev.hidden, id],
    }));
  }
  function showWidget(id: WidgetId) {
    setLayout((prev) => {
      const col = prev.columns[0].length <= prev.columns[1].length ? 0 : 1;
      const columns: [WidgetId[], WidgetId[]] = [
        [...prev.columns[0]],
        [...prev.columns[1]],
      ];
      columns[col].push(id);
      return { columns, hidden: prev.hidden.filter((x) => x !== id) };
    });
  }
  function setDropTarget(col: 0 | 1, before: WidgetId | null) {
    setDrop((p) =>
      p && p.col === col && p.before === before ? p : { col, before },
    );
  }
  function doDrop(col: 0 | 1, before: WidgetId | null) {
    if (dragId) applyMove(dragId, col, before);
    setDragId(null);
    setDrop(null);
  }

  function column(col: 0 | 1) {
    const ids = layout.columns[col].filter((id) => editing || !isEmpty(id));
    return (
      <div className="flex flex-col gap-5">
        {ids.map((id) => {
          const isTarget = drop?.col === col && drop.before === id;
          const empty = isEmpty(id);
          return (
            <div
              key={id}
              draggable={editing}
              onDragStart={(e) => {
                if (!editing) return;
                setDragId(id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setDrop(null);
              }}
              onDragOver={
                editing
                  ? (e) => {
                      e.preventDefault();
                      setDropTarget(col, id);
                    }
                  : undefined
              }
              onDrop={
                editing
                  ? (e) => {
                      e.preventDefault();
                      doDrop(col, id);
                    }
                  : undefined
              }
              className={`relative transition ${
                editing ? "cursor-grab active:cursor-grabbing" : ""
              } ${dragId === id ? "opacity-40" : ""}`}
            >
              {isTarget && (
                <div className="absolute -top-2.5 inset-x-0 h-[3px] rounded-full bg-[var(--accent)] z-10" />
              )}
              {editing && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                  <span className="grid place-items-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-soft)] text-[var(--text-faint)]">
                    <GripVertical size={12} />
                  </span>
                  <button
                    type="button"
                    onClick={() => hideWidget(id)}
                    title="Remove widget"
                    className="grid place-items-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-soft)] text-[var(--text-faint)] hover:text-red-500/90 hover:border-red-500/40 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <div className={editing ? "pointer-events-none select-none" : ""}>
                {empty && editing ? (
                  <EmptyPlaceholder id={id} />
                ) : (
                  renderWidget(id)
                )}
              </div>
            </div>
          );
        })}

        {editing && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDropTarget(col, null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              doDrop(col, null);
            }}
            className={`rounded-[12px] border border-dashed grid place-items-center min-h-[48px] text-[10px] uppercase tracking-[0.14em] transition ${
              drop?.col === col && drop.before === null
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-glow)]"
                : "border-[var(--border-soft)] text-[var(--text-faint)]"
            }`}
          >
            drop here
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-5">
      <TodayHero
        openTaskCount={openTasks.length}
        habitsDoneToday={habitsDoneToday}
        habitTotal={habits.length}
        streak={bestStreak}
        weekCounts={weekCounts}
      />

      {/* Customize toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {editing ? (
          <>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)] shrink-0">
                Add:
              </span>
              {layout.hidden.length === 0 ? (
                <span className="text-[12px] text-[var(--text-faint)]">
                  All widgets shown
                </span>
              ) : (
                layout.hidden.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => showWidget(id)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                  >
                    <Plus size={11} />
                    {WIDGET_META[id]}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLayout(DEFAULT_LAYOUT)}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] transition"
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1.5 text-[12px] font-medium hover:opacity-90 transition"
              >
                <Check size={13} />
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Your day
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[12px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
            >
              <SlidersHorizontal size={12} />
              Customize
            </button>
          </>
        )}
      </div>

      {/* Widget grid */}
      <div
        className={`grid lg:grid-cols-2 gap-5 items-start ${
          editing
            ? "rounded-[16px] p-3 -m-3 bg-[var(--bg-rail)] ring-1 ring-[var(--border-soft)]"
            : ""
        }`}
      >
        {column(0)}
        {column(1)}
      </div>
    </div>
  );
}

// ── Widgets that were inline ─────────────────────────────────────────────────

function AgendaCard({
  upcoming,
  startOfToday,
}: {
  upcoming: Array<{
    id: string;
    title: string;
    kind: string;
    isReminder: boolean;
    when: Date;
  }>;
  startOfToday: Date;
}) {
  return (
    <Card icon={CalendarDays} title="Next 7 days" href="/calendar" tint="var(--accent)">
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
  );
}

function TopTasksCard({ openTasks }: { openTasks: Item[] }) {
  return (
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
  );
}

function HabitsCard({ habits, today }: { habits: Item[]; today: string }) {
  return (
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
  );
}

function EmptyPlaceholder({ id }: { id: WidgetId }) {
  return (
    <div className="life-card p-4 border border-dashed border-[var(--border-soft)]">
      <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {WIDGET_META[id]}
      </h2>
      <p className="mt-2 text-[12.5px] text-[var(--text-faint)]">
        Nothing to show today — this widget appears when there&apos;s something
        here.
      </p>
    </div>
  );
}

function SubscriptionsTile({ items }: { items: Item[] }) {
  const active = items.filter((i) => i.status !== "archived");
  if (active.length === 0) return null;

  const totals = monthlyTotals(active);
  const totalsEntries = Object.entries(totals);
  const upcoming = active
    .map((item) => {
      const sub = readSubscription(item);
      return sub?.nextChargeAt
        ? { item, sub, t: new Date(sub.nextChargeAt).getTime() }
        : null;
    })
    .filter(
      (x): x is { item: Item; sub: NonNullable<ReturnType<typeof readSubscription>>; t: number } =>
        x !== null,
    )
    .filter((x) => x.t <= Date.now() + 7 * 86_400_000)
    .sort((a, b) => a.t - b.t)
    .slice(0, 4);

  return (
    <Card icon={CreditCard} title="Subscriptions" href="/subscriptions" tint="var(--gold)">
      <div className="space-y-2">
        {totalsEntries.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--text-muted)]">
            {totalsEntries.map(([currency, monthly]) => (
              <span key={currency} className="tabular-nums">
                <span className="font-semibold text-[var(--text)]">
                  {formatMoney(Math.round(monthly), currency)}
                </span>
                <span className="ml-1 opacity-70">/mo</span>
              </span>
            ))}
          </div>
        )}
        {upcoming.length > 0 ? (
          <ul className="space-y-1.5 mt-2">
            {upcoming.map(({ item, sub }) => (
              <li key={item.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--gold)" }}
                />
                <Link
                  href="/subscriptions"
                  className="text-[var(--text)] hover:text-[var(--accent)] truncate flex-1"
                >
                  {item.title}
                </Link>
                <span className="text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] tabular-nums shrink-0">
                  {formatMoney(sub.amount, sub.currency)} ·{" "}
                  {nextChargeLabel(sub.nextChargeAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-faint)]">
            Nothing renews this week.
          </p>
        )}
      </div>
    </Card>
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
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
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
          style={{
            background: `linear-gradient(90deg, transparent, ${tint}, transparent)`,
          }}
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
