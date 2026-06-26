"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Dumbbell, X, Pencil, Check } from "lucide-react";
import { Portal } from "@/components/portal";
import { upsertDayFocus } from "@/lib/store/gym";
import { ymd } from "@/lib/ymd";
import type { WeightUnit } from "@/lib/store/health";
import {
  FOCUS_GROUPS,
  focusColor,
  type Workout,
} from "@/lib/gym/types";
import { workoutVolume, workoutSetCount } from "@/lib/gym/calc";
import { EmptyState, fmtWeight } from "./ui";

function weekDates(now = new Date()): string[] {
  const sunday = new Date(now);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return ymd(d);
  });
}

export function LogTab({
  workouts,
  unit,
  onNew,
  onEdit,
}: {
  workouts: Workout[] | undefined;
  unit: WeightUnit;
  onNew: (date?: string) => void;
  onEdit: (w: Workout) => void;
}) {
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const today = ymd(new Date());
  const week = useMemo(() => weekDates(), []);

  const byDate = useMemo(() => {
    const m = new Map<string, Workout>();
    for (const w of workouts ?? []) if (!m.has(w.date)) m.set(w.date, w);
    return m;
  }, [workouts]);

  const dayWorkout = sheetDay ? byDate.get(sheetDay) : undefined;

  return (
    <div className="space-y-5">
      {/* Week strip */}
      <div>
        <div className="text-[11px] text-[var(--muted)] mb-2 px-0.5 font-medium">
          This week
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const w = byDate.get(d);
            const isToday = d === today;
            const date = new Date(`${d}T12:00:00`);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSheetDay(d)}
                className="rounded-[11px] border p-2 text-center transition hover:-translate-y-px active:translate-y-0"
                style={{
                  borderColor: isToday
                    ? "color-mix(in oklch, var(--terra) 35%, transparent)"
                    : "var(--line)",
                  background: isToday
                    ? "color-mix(in oklch, var(--terra-tint) 55%, var(--paper))"
                    : "var(--paper)",
                }}
              >
                <div className="text-[9.5px] uppercase tracking-[0.06em] text-[var(--muted)]">
                  {date.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div
                  className={`text-[13px] font-semibold tabular-nums my-1 ${
                    isToday ? "text-[var(--terra)]" : "text-[var(--ink)]"
                  }`}
                >
                  {date.getDate()}
                </div>
                {w?.focus ? (
                  <div
                    className="text-[9.5px] font-semibold rounded-[6px] py-0.5 truncate px-0.5"
                    style={{
                      color: focusColor(w.focus),
                      background: `color-mix(in oklch, ${focusColor(w.focus)} 16%, transparent)`,
                    }}
                  >
                    {w.focus}
                  </div>
                ) : w ? (
                  <div className="text-[9.5px] text-[var(--muted)]">logged</div>
                ) : isToday ? (
                  <div className="text-[12px] text-[var(--terra)] leading-none">
                    <Plus size={13} className="inline" />
                  </div>
                ) : (
                  <div className="text-[9.5px] text-[var(--muted-2)]">rest</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary action */}
      <button
        type="button"
        onClick={() => onNew(today)}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-[12px] bg-[var(--terra)] text-white text-[14px] font-semibold hover:brightness-105 active:translate-y-px transition"
      >
        <Plus size={17} />
        Log a workout
      </button>

      {/* Recent */}
      {workouts === undefined ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[72px] rounded-[12px] bg-[var(--bg-2)] animate-pulse"
            />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet."
          body="Log your first session, or tap a day above to record what you trained — Legs, Push, Pull, whatever it was."
        />
      ) : (
        <div className="space-y-2.5">
          <div className="text-[11px] text-[var(--muted)] px-0.5 font-medium">
            Recent
          </div>
          {workouts.slice(0, 25).map((w) => (
            <WorkoutCard key={w.id} w={w} unit={unit} onClick={() => onEdit(w)} />
          ))}
        </div>
      )}

      {sheetDay && (
        <DayFocusSheet
          day={sheetDay}
          current={dayWorkout?.focus ?? null}
          onPick={async (f) => {
            await upsertDayFocus(sheetDay, f);
            toast.success(f ? `${f} logged` : "Cleared");
            setSheetDay(null);
          }}
          onFullLog={() => {
            const d = sheetDay;
            setSheetDay(null);
            if (dayWorkout) onEdit(dayWorkout);
            else onNew(d);
          }}
          onClose={() => setSheetDay(null)}
        />
      )}
    </div>
  );
}

function WorkoutCard({
  w,
  unit,
  onClick,
}: {
  w: Workout;
  unit: WeightUnit;
  onClick: () => void;
}) {
  const date = new Date(`${w.date}T12:00:00`);
  const vol = workoutVolume(w);
  const sets = workoutSetCount(w);
  const label = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full life-card p-3.5 flex items-center gap-3 text-left hover:border-[var(--terra)]/40 transition group"
    >
      <span
        className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0"
        style={{
          background: `color-mix(in oklch, ${focusColor(w.focus)} 14%, transparent)`,
          color: focusColor(w.focus),
        }}
      >
        <Dumbbell size={17} strokeWidth={1.7} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
            {w.title || w.focus || "Workout"}
          </span>
          {w.focus && (
            <span
              className="text-[10px] font-semibold rounded-[6px] px-1.5 py-0.5 shrink-0"
              style={{
                color: focusColor(w.focus),
                background: `color-mix(in oklch, ${focusColor(w.focus)} 15%, transparent)`,
              }}
            >
              {w.focus}
            </span>
          )}
        </div>
        <div className="text-[11.5px] text-[var(--muted)] tabular-nums mt-0.5">
          {label}
          {w.entries.length > 0 &&
            ` · ${w.entries.length} ex · ${sets} sets`}
          {vol > 0 && ` · ${fmtWeight(vol, unit)} ${unit}`}
        </div>
      </div>
      <Pencil
        size={14}
        className="text-[var(--muted-2)] opacity-0 group-hover:opacity-100 transition shrink-0"
      />
    </button>
  );
}

function DayFocusSheet({
  day,
  current,
  onPick,
  onFullLog,
  onClose,
}: {
  day: string;
  current: string | null;
  onPick: (f: string | null) => void;
  onFullLog: () => void;
  onClose: () => void;
}) {
  const date = new Date(`${day}T12:00:00`);
  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[400px] rounded-[18px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-[var(--line)]">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                What did you train?
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-semibold text-[var(--ink)]">
                  {date.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {current && (
                  <span
                    className="text-[10px] font-semibold rounded-[6px] px-1.5 py-0.5"
                    style={{
                      color: focusColor(current),
                      background: `color-mix(in oklch, ${focusColor(current)} 16%, transparent)`,
                    }}
                  >
                    {current}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Grouped focus chips */}
          <div className="px-5 py-4 space-y-4">
            {FOCUS_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--muted-2)] mb-2">
                  {g.label}
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((f) => {
                    const on = current === f;
                    const c = focusColor(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => onPick(on ? null : f)}
                        className={`inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full text-[12.5px] font-medium border transition active:scale-[0.97] ${
                          on
                            ? "text-white"
                            : "bg-[var(--paper)] border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--terra)] hover:-translate-y-px"
                        }`}
                        style={on ? { background: c, borderColor: c } : undefined}
                      >
                        {on ? (
                          <Check size={13} strokeWidth={3} />
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: c }}
                          />
                        )}
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--line)]">
            {current && (
              <button
                type="button"
                onClick={() => onPick(null)}
                className="w-full px-5 py-2.5 text-left text-[11.5px] text-[var(--muted)] hover:text-[var(--bad)] transition border-b border-[var(--line)]"
              >
                Clear focus
              </button>
            )}
            <button
              type="button"
              onClick={onFullLog}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[12.5px] font-medium text-[var(--terra)] hover:bg-[var(--bg-card-hover)] transition"
            >
              <Plus size={14} />
              Log full workout (sets &amp; reps)
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
