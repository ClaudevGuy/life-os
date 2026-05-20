"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Flame } from "lucide-react";
import { HabitCard } from "./habit-card";
import { NewHabit } from "./new-habit";
import { EmptyState, PageHeader } from "@/components/empty-state";

export default function HabitsPage() {
  const rows = useItemsOfKind("habit") ?? [];

  const today = new Date().toISOString().slice(0, 10);
  let doneToday = 0;
  let bestStreak = 0;
  for (const h of rows) {
    const m = (h.metadata ?? {}) as { checkins?: string[] };
    const checkins = m.checkins ?? [];
    if (checkins.includes(today)) doneToday++;
    let streak = 0;
    const set = new Set(checkins);
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86_400_000)
        .toISOString()
        .slice(0, 10);
      if (set.has(d)) streak++;
      else if (i === 0) continue;
      else break;
    }
    if (streak > bestStreak) bestStreak = streak;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        icon={Flame}
        title="Habits"
        subtitle="Small daily moves. Streaks visible. Missed days forgiven."
        tint="var(--kind-habit)"
        action={<NewHabit />}
      />

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 life-stagger">
          <Stat label="Tracked" value={rows.length} tone="default" />
          <Stat
            label="Done today"
            value={`${doneToday}/${rows.length}`}
            tone="accent"
          />
          <Stat label="Best streak" value={bestStreak} tone="fire" />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Flame}
          tint="var(--kind-habit)"
          title="Build your first habit."
          body="Small daily moves compound. Pick one — Morning walk, Read 10 pages, Drink water — and check it off when it's done."
          actions={[{ label: "New habit", onClickKey: "c" }]}
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 life-stagger">
          {rows.map((h) => (
            <HabitCard key={h.id} habit={h} />
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
}: {
  label: string;
  value: number | string;
  tone: "default" | "accent" | "fire";
}) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "fire"
      ? "text-orange-400"
      : "text-[var(--text)]";
  return (
    <div className="life-card p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}
