"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Flame } from "lucide-react";
import { HabitCard } from "./habit-card";
import { NewHabit } from "./new-habit";
import type { StoredItem } from "@/lib/store/items";
import { ymd } from "@/lib/ymd";
import { calcStreak, type Cadence } from "@/lib/habits";

const HABIT_PALETTE = [
  "var(--sage)",
  "var(--gold)",
  "var(--terra)",
  "var(--plum)",
  "var(--sky)",
];

export default function HabitsPage() {
  const rows = (useItemsOfKind("habit") ?? []) as StoredItem[];

  const today = ymd(new Date());
  let doneToday = 0;
  let bestStreak = 0;

  for (const h of rows) {
    const m = (h.metadata ?? {}) as { checkins?: string[]; cadence?: Cadence };
    const set = new Set(m.checkins ?? []);
    if (set.has(today)) doneToday++;
    const s = calcStreak(set, m.cadence ?? "daily");
    if (s > bestStreak) bestStreak = s;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Flame size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
            Habits
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Small things, daily. Stack them until they&apos;re who you are.
          </p>
        </div>
        <NewHabit />
      </header>

      <div className="grid grid-cols-3 gap-3 life-stagger mb-6">
        <Stat label="Habits" value={rows.length} tone="ink" />
        <Stat
          label="Today"
          value={`${doneToday}/${rows.length}`}
          tone="terra"
          hint={
            rows.length > 0 && doneToday === rows.length
              ? "all done 🎉"
              : undefined
          }
        />
        <Stat label="Best streak" value={`${bestStreak}d`} tone="gold" />
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
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
            Drink water — and check it off when it&apos;s done.
          </p>
        </div>
      ) : (
        <div className="space-y-4 life-stagger">
          {rows.map((h, i) => (
            <HabitCard
              key={h.id}
              habit={h}
              color={HABIT_PALETTE[i % HABIT_PALETTE.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number | string;
  tone: "ink" | "terra" | "gold";
  hint?: string;
}) {
  const color =
    tone === "terra"
      ? "var(--terra)"
      : tone === "gold"
        ? "var(--gold)"
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
      {hint && (
        <div className="mt-2 text-[11px] text-[var(--muted)]">{hint}</div>
      )}
    </div>
  );
}
