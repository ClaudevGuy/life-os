"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Flame, Check, Pencil, Trash2 } from "lucide-react";
import type { StoredItem as Item } from "@/lib/store/items";
import { updateItem, deleteItem } from "@/lib/store/items";
import { HabitFormModal } from "./new-habit";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function last30Days(): string[] {
  return Array.from({ length: 30 }).map((_, i) =>
    ymd(new Date(Date.now() - (29 - i) * 86_400_000)),
  );
}

function calcStreak(checkins: Set<string>): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = ymd(new Date(Date.now() - i * 86_400_000));
    if (checkins.has(d)) streak++;
    else if (i === 0) continue; // allow missing today
    else break;
  }
  return streak;
}

export function HabitRow({
  habit,
  color,
  weekDates,
}: {
  habit: Item;
  color: string;
  weekDates: string[];
}) {
  const meta = (habit.metadata ?? {}) as { checkins?: string[]; cadence?: string };
  const [checkins, setCheckins] = useState<Set<string>>(
    new Set(meta.checkins ?? []),
  );
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const today = ymd(new Date());

  const streak = useMemo(() => calcStreak(checkins), [checkins]);
  const grid = useMemo(() => last30Days(), []);
  const isFutureDate = (d: string) => d > today;

  function toggleDay(d: string) {
    if (isFutureDate(d)) return;
    const next = new Set(checkins);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setCheckins(next);
    startTransition(async () => {
      await updateItem(habit.id, {
        metadata: { ...meta, checkins: [...next] },
      });
    });
  }

  function remove() {
    if (!confirm(`Delete habit "${habit.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteItem(habit.id);
        toast.success("Habit deleted");
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <li className="group px-5 py-4 grid grid-cols-[1fr_auto_auto_auto_auto] sm:grid-cols-[1fr_60px_minmax(0,200px)_minmax(0,120px)_auto] gap-4 sm:gap-6 items-center border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--paper-2)] transition relative">
      {/* Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-[15px] font-medium text-[var(--ink)] truncate">
          {habit.title}
        </span>
      </div>

      {/* Streak */}
      <div className="inline-flex items-center gap-1.5 justify-end shrink-0">
        <Flame
          size={13}
          strokeWidth={1.6}
          className={
            streak > 0 ? "text-[var(--terra)]" : "text-[var(--muted-2)]"
          }
        />
        <span
          className={`text-[14px] tabular-nums font-semibold ${
            streak > 0 ? "text-[var(--ink)]" : "text-[var(--muted-2)]"
          }`}
        >
          {streak}
        </span>
      </div>

      {/* Week cells */}
      <div className="hidden sm:grid grid-cols-7 gap-1.5">
        {weekDates.map((d) => {
          const done = checkins.has(d);
          const future = isFutureDate(d);
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              disabled={pending || future}
              aria-label={done ? `Uncheck ${d}` : `Check ${d}`}
              title={d}
              className="grid place-items-center aspect-square rounded-[6px] transition disabled:cursor-not-allowed"
              style={{
                border: `1.4px solid ${done ? color : "var(--line-2)"}`,
                background: done ? color : "transparent",
                color: "var(--paper)",
                opacity: future ? 0.35 : 1,
                boxShadow: isToday && !done
                  ? `inset 0 0 0 1.4px ${color}`
                  : undefined,
              }}
            >
              {done && <Check size={12} strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      {/* 30-day sparkline */}
      <div className="hidden sm:block min-w-0">
        <ThirtyDay grid={grid} checkins={checkins} color={color} />
      </div>

      {/* Actions — visible on row hover (always visible on touch) */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit"
          aria-label="Edit habit"
          className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
        >
          <Pencil size={13} strokeWidth={1.6} />
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          title="Delete"
          aria-label="Delete habit"
          className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--terra-tint)] hover:text-[var(--bad)] hover:border-[var(--bad)]/30 transition disabled:opacity-50"
        >
          <Trash2 size={13} strokeWidth={1.6} />
        </button>
      </div>

      {editing && (
        <HabitFormModal
          existing={habit}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}

function ThirtyDay({
  grid,
  checkins,
  color,
}: {
  grid: string[];
  checkins: Set<string>;
  color: string;
}) {
  const W = 100;
  const H = 22;
  const pts = grid
    .map((d, i) => {
      const x = (i / (grid.length - 1)) * W;
      const has = checkins.has(d);
      const y = has ? 4 : H - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
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
