"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Flame, Check, Pencil, Trash2 } from "lucide-react";
import type { StoredItem as Item } from "@/lib/store/items";
import { updateItem, deleteItem } from "@/lib/store/items";
import { HabitFormModal } from "./new-habit";
import { ymd } from "@/lib/ymd";
import { calcStreak, type Cadence } from "@/lib/habits";

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
const HEATMAP_WEEKS = 13;

function thisWeek(): Date[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sun = new Date(now);
  sun.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d;
  });
}

function heatmapWeeks(weeks: number): Date[][] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const startSun = new Date(now);
  startSun.setDate(now.getDate() - now.getDay() - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const dt = new Date(startSun);
      dt.setDate(startSun.getDate() + w * 7 + d);
      return dt;
    }),
  );
}

export function HabitCard({ habit, color }: { habit: Item; color: string }) {
  const meta = (habit.metadata ?? {}) as {
    checkins?: string[];
    cadence?: Cadence;
  };
  const cadence: Cadence = meta.cadence ?? "daily";
  const [checkins, setCheckins] = useState<Set<string>>(
    new Set(meta.checkins ?? []),
  );
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const today = ymd(new Date());
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const streak = useMemo(
    () => calcStreak(checkins, cadence),
    [checkins, cadence],
  );
  const week = useMemo(() => thisWeek(), []);
  const weeks = useMemo(() => heatmapWeeks(HEATMAP_WEEKS), []);

  const weekDone = week.filter(
    (d) => d <= todayDate && checkins.has(ymd(d)),
  ).length;
  const windowDays = weeks.flat().filter((d) => d <= todayDate);
  const windowDone = windowDays.filter((d) => checkins.has(ymd(d))).length;
  const pct = windowDays.length
    ? Math.round((windowDone / windowDays.length) * 100)
    : 0;

  function toggle(d: Date) {
    if (d > todayDate) return;
    const iso = ymd(d);
    const next = new Set(checkins);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
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

  const tint = `color-mix(in oklch, ${color} 14%, transparent)`;
  const border = `1px solid color-mix(in oklch, ${color} 30%, transparent)`;

  return (
    <div className="group life-card p-5 relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: color }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit habit"
          className="flex items-center gap-3 min-w-0 text-left"
        >
          <span
            className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0"
            style={{ background: tint, color, border }}
          >
            <Flame size={18} strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate group-hover:text-[var(--terra)] transition">
              {habit.title}
            </h3>
            <div className="mt-0.5 text-[12px] text-[var(--muted)]">
              <span className="capitalize">{cadence}</span> · {weekDone}/7 this
              week
            </div>
          </div>
        </button>

        <div className="flex items-start gap-4 shrink-0">
          {/* Streak */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1">
              <Flame
                size={16}
                strokeWidth={1.8}
                fill={streak > 0 ? "var(--terra)" : "none"}
                stroke={streak > 0 ? "var(--terra)" : "var(--muted-2)"}
              />
              <span
                className="text-[20px] font-semibold tabular-nums leading-none"
                style={{ color: streak > 0 ? "var(--ink)" : "var(--muted-2)" }}
              >
                {streak}
              </span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted-2)] mt-1">
              {cadence === "weekly" ? "wk streak" : "day streak"}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
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
        </div>
      </div>

      {/* Week strip + heatmap */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 md:gap-8 items-start">
        {/* This week */}
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)] mb-2">
            This week
          </div>
          <div className="flex gap-1.5">
            {week.map((d, i) => {
              const iso = ymd(d);
              const done = checkins.has(iso);
              const future = d > todayDate;
              const isToday = iso === today;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span
                    className="text-[10px] uppercase font-semibold"
                    style={{
                      color: isToday ? "var(--terra)" : "var(--muted-2)",
                    }}
                  >
                    {WEEKDAY[i]}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(d)}
                    disabled={pending || future}
                    aria-label={`${done ? "Uncheck" : "Check"} ${iso}`}
                    title={iso}
                    className="grid place-items-center w-9 h-9 rounded-[9px] transition disabled:cursor-not-allowed hover:scale-[1.05] active:scale-95"
                    style={{
                      border: `1.6px solid ${
                        done ? color : isToday ? color : "var(--line-2)"
                      }`,
                      background: done ? color : "transparent",
                      color: "var(--paper)",
                      opacity: future ? 0.3 : 1,
                      boxShadow:
                        isToday && !done ? `inset 0 0 0 1.6px ${color}` : undefined,
                    }}
                  >
                    {done ? (
                      <Check size={15} strokeWidth={2.6} />
                    ) : (
                      <span
                        className="text-[11px] tabular-nums font-semibold"
                        style={{ color: isToday ? color : "var(--muted-2)" }}
                      >
                        {d.getDate()}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)]">
              Last {HEATMAP_WEEKS} weeks
            </span>
            <span className="text-[11px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink-2)] tabular-nums">
                {pct}%
              </span>{" "}
              done
            </span>
          </div>
          <Heatmap
            weeks={weeks}
            checkins={checkins}
            color={color}
            todayDate={todayDate}
          />
        </div>
      </div>

      {editing && (
        <HabitFormModal existing={habit} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}

function Heatmap({
  weeks,
  checkins,
  color,
  todayDate,
}: {
  weeks: Date[][];
  checkins: Set<string>;
  color: string;
  todayDate: Date;
}) {
  return (
    <div className="flex gap-[3px]">
      {weeks.map((days, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {days.map((d, di) => {
            const iso = ymd(d);
            const future = d > todayDate;
            const done = checkins.has(iso);
            return (
              <span
                key={di}
                title={iso}
                className="w-[13px] h-[13px] rounded-[3px]"
                style={{
                  background: done
                    ? color
                    : future
                      ? "transparent"
                      : "var(--bg-2)",
                  border: future ? "1px dashed var(--line)" : "none",
                  opacity: future ? 0.5 : 1,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
