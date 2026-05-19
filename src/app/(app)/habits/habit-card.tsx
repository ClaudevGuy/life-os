"use client";

import { useState, useTransition } from "react";
import { Flame } from "lucide-react";
import type { StoredItem as Item } from "@/lib/store/items";
import { updateItem } from "@/lib/store/items";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function last30Days() {
  const out: string[] = [];
  for (let i = 29; i >= 0; i--) {
    out.push(ymd(new Date(Date.now() - i * 86_400_000)));
  }
  return out;
}

function calcStreak(checkins: Set<string>) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = ymd(new Date(Date.now() - i * 86_400_000));
    if (checkins.has(d)) streak++;
    else if (i === 0) continue; // allow missing today
    else break;
  }
  return streak;
}

export function HabitCard({ habit }: { habit: Item }) {
  const meta = (habit.metadata ?? {}) as { checkins?: string[]; cadence?: string };
  const [checkins, setCheckins] = useState<Set<string>>(
    new Set(meta.checkins ?? []),
  );
  const [pending, startTransition] = useTransition();

  const today = ymd(new Date());
  const isCheckedToday = checkins.has(today);
  const streak = calcStreak(checkins);
  const grid = last30Days();

  function toggleToday() {
    const next = new Set(checkins);
    if (next.has(today)) next.delete(today);
    else next.add(today);
    setCheckins(next);
    startTransition(async () => {
      await updateItem(habit.id, {
        metadata: { ...meta, checkins: [...next] },
      });
    });
  }

  return (
    <div className="life-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{habit.title}</div>
          {habit.summary && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
              {habit.summary}
            </p>
          )}
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-[var(--text-faint)]">
            <Flame size={11} className={streak > 0 ? "text-[var(--accent)]" : ""} />
            {streak} day streak · {meta.cadence ?? "daily"}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleToday}
          disabled={pending}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            isCheckedToday
              ? "bg-[var(--accent)] text-zinc-950 hover:brightness-110"
              : "border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]"
          }`}
        >
          {isCheckedToday ? "Done today" : "Check in"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px]">
        {grid.map((d, i) => {
          const has = checkins.has(d);
          const isToday = d === today;
          return (
            <div
              key={d}
              title={d}
              className="aspect-square rounded-[3px]"
              style={{
                background: has
                  ? "var(--accent)"
                  : isToday
                  ? "var(--border-strong)"
                  : "var(--border-soft)",
                opacity: has ? Math.max(0.4, 1 - i * 0.02) : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
