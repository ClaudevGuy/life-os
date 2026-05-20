"use client";

import { useMemo } from "react";
import { useItemsOfKind } from "@/lib/store/items";
import { Flame } from "lucide-react";
import { HabitRow } from "./habit-card";
import { NewHabit } from "./new-habit";
import type { StoredItem } from "@/lib/store/items";

const HABIT_PALETTE = [
  "var(--sage)",
  "var(--gold)",
  "var(--terra)",
  "var(--plum)",
  "var(--sky)",
];

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function thisWeekDates(): string[] {
  // Monday-anchored 7-day window starting from this week's Monday.
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dow = now.getDay(); // 0 = Sun
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + offsetToMonday);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return ymd(d);
  });
}

function calcStreak(checkins: Set<string>): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = ymd(new Date(Date.now() - i * 86_400_000));
    if (checkins.has(d)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

export default function HabitsPage() {
  const rows = (useItemsOfKind("habit") ?? []) as StoredItem[];

  const today = ymd(new Date());
  const week = useMemo(() => thisWeekDates(), []);

  let doneToday = 0;
  let bestStreak = 0;
  let weekHits = 0;
  let weekCells = 0;

  // 14-day sparkline of total checkins across all habits
  const last14 = Array.from({ length: 14 }).map((_, i) =>
    ymd(new Date(Date.now() - (13 - i) * 86_400_000)),
  );
  const sparkData: number[] = new Array(14).fill(0);

  for (const h of rows) {
    const m = (h.metadata ?? {}) as { checkins?: string[] };
    const checkins = m.checkins ?? [];
    const set = new Set(checkins);
    if (set.has(today)) doneToday++;
    const s = calcStreak(set);
    if (s > bestStreak) bestStreak = s;

    for (const d of week) {
      weekCells++;
      if (set.has(d)) weekHits++;
    }
    for (let i = 0; i < 14; i++) {
      if (set.has(last14[i])) sparkData[i]++;
    }
  }

  const weekPct = weekCells > 0 ? Math.round((weekHits / weekCells) * 100) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Flame
              size={20}
              className="text-[var(--terra)]"
              strokeWidth={1.6}
            />
            Habits
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Small things, daily. Stack them until they're who you are.
          </p>
        </div>
        <NewHabit />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger mb-6">
        <Stat label="Habits" value={rows.length} tone="ink" />
        <Stat
          label="Today"
          value={`${doneToday}/${rows.length}`}
          tone="terra"
        />
        <Stat label="Best streak" value={`${bestStreak}d`} tone="gold" />
        <Stat
          label="Week consistency"
          value={`${weekPct}%`}
          tone="sage"
          sparkline={sparkData}
        />
      </div>

      {rows.length === 0 ? (
        <div
          className="mt-4 rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center"
        >
          <div
            className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
            style={{ boxShadow: "var(--shadow-1)" }}
          >
            <Flame size={22} strokeWidth={1.6} />
          </div>
          <div className="text-[17px] font-medium text-[var(--ink)]">
            Build your first habit.
          </div>
          <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
            Small daily moves compound. Pick one — Morning walk, Read 10 pages,
            Drink water — and check it off when it's done.
          </p>
        </div>
      ) : (
        <div className="life-card overflow-hidden">
          {/* Header row */}
          <div className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_60px_minmax(0,200px)_minmax(0,120px)] gap-4 sm:gap-6 items-center text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] border-b border-[var(--line)]">
            <span>Habit</span>
            <span className="text-right">Streak</span>
            <div className="hidden sm:grid grid-cols-7 gap-1.5 text-center">
              {WEEKDAY_LABELS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <span className="hidden sm:block text-right">30d</span>
          </div>
          <ul>
            {rows.map((h, i) => (
              <HabitRow
                key={h.id}
                habit={h}
                color={HABIT_PALETTE[i % HABIT_PALETTE.length]}
                weekDates={week}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  sparkline,
}: {
  label: string;
  value: number | string;
  tone: "ink" | "terra" | "gold" | "sage";
  sparkline?: number[];
}) {
  const color =
    tone === "terra"
      ? "var(--terra)"
      : tone === "gold"
      ? "var(--gold)"
      : tone === "sage"
      ? "var(--sage)"
      : "var(--ink)";

  return (
    <div className="life-card p-5 flex flex-col">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-[34px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color }}
      >
        {value}
      </div>
      {sparkline && sparkline.length > 1 && (
        <Sparkline data={sparkline} color={color} />
      )}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const W = 100;
  const H = 18;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - (v / max) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="mt-3"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
