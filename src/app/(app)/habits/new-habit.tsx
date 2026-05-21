"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  Flame,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarRange,
} from "lucide-react";
import { captureItem, updateItem, type StoredItem } from "@/lib/store/items";
import { Portal } from "@/components/portal";
import { ymd } from "@/lib/ymd";
import {
  type Cadence,
  calcStreak,
  thisWeekCount,
} from "@/lib/habits";

const CADENCES: Cadence[] = ["daily", "weekdays", "weekly"];

const HABIT_PALETTE = [
  "var(--sage)",
  "var(--gold)",
  "var(--terra)",
  "var(--plum)",
  "var(--sky)",
];

function habitColor(habit: StoredItem | null): string {
  if (!habit) return "var(--sage)";
  const seed = habit.title ?? habit.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return HABIT_PALETTE[Math.abs(hash) % HABIT_PALETTE.length];
}

export function NewHabit() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New habit
      </button>
    );
  }

  return <HabitFormModal existing={null} onClose={() => setOpen(false)} />;
}

export function HabitFormModal({
  existing,
  onClose,
}: {
  existing: StoredItem | null;
  onClose: () => void;
}) {
  const existingMeta = (existing?.metadata ?? {}) as {
    cadence?: Cadence;
    checkins?: string[];
  };
  const [title, setTitle] = useState(existing?.title ?? "");
  const [summary, setSummary] = useState(existing?.body ?? "");
  const [cadence, setCadence] = useState<Cadence>(
    existingMeta.cadence ?? "daily",
  );
  // Local copy of checkins so calendar toggles feel instant while we persist.
  const [checkins, setCheckins] = useState<Set<string>>(
    () => new Set(existingMeta.checkins ?? []),
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!title.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        if (existing) {
          await updateItem(existing.id, {
            title: title.trim(),
            body: summary.trim() || null,
            metadata: {
              ...existingMeta,
              cadence,
              checkins: [...checkins],
            },
          });
          toast.success("Updated");
        } else {
          await captureItem({
            kind: "habit",
            title: title.trim(),
            body: summary.trim() || null,
            metadata: { cadence, checkins: [] },
          });
          toast.success("Habit added");
        }
      } catch {
        toast.error("Couldn't save");
        return;
      }
      onClose();
    });
  }

  function toggleDay(key: string) {
    if (key > ymd()) return; // never toggle the future
    const next = new Set(checkins);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCheckins(next);

    // Persist immediately when editing an existing habit — calendar toggles
    // feel like check-ins, not "pending edits."
    if (existing) {
      void updateItem(existing.id, {
        metadata: {
          ...existingMeta,
          cadence,
          checkins: [...next],
        },
      }).catch(() => toast.error("Couldn't sync check-in"));
    }
  }

  const color = habitColor(existing);
  const streak = useMemo(
    () => calcStreak(checkins, cadence),
    [checkins, cadence],
  );
  const weekCount = useMemo(
    () => thisWeekCount([...checkins]),
    [checkins],
  );
  const total = checkins.size;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className={`w-full ${
            existing ? "max-w-2xl" : "max-w-sm"
          } rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise flex flex-col max-h-[calc(100vh-128px)] overflow-hidden`}
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 pb-4 shrink-0">
            <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--ink)]">
              <Flame
                size={15}
                strokeWidth={1.6}
                className="text-[var(--terra)]"
              />
              {existing ? "Edit habit" : "New habit"}
            </h2>
          </div>

          {/* Body — scrolls when content is tall */}
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Habit name (e.g. Morning walk)"
              autoFocus
              className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            />
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Why (optional)"
              className="mt-2 w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            />

            <div className="mt-4">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
                Cadence
              </div>
              <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)]">
                {CADENCES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCadence(c)}
                    className={`text-[12.5px] capitalize px-3 py-1 rounded-[7px] font-medium transition ${
                      cadence === c
                        ? "bg-[var(--paper)] text-[var(--ink)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                    style={
                      cadence === c
                        ? { boxShadow: "var(--shadow-1)" }
                        : undefined
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--muted-2)]">
                {cadence === "weekly"
                  ? "Streak counts weeks with at least one check-in. Resets each Monday."
                  : cadence === "weekdays"
                  ? "Weekends don't count against the streak."
                  : "Streak counts consecutive days with a check-in."}
              </p>
            </div>

            {/* History — only for an existing habit */}
            {existing && (
              <>
                <div className="mt-6 mb-3 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                  <CalendarRange size={12} strokeWidth={1.6} />
                  History
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Stat
                    label={cadence === "weekly" ? "Streak (wks)" : "Streak"}
                    value={`${streak}${cadence === "weekly" ? "w" : "d"}`}
                    color="var(--terra)"
                  />
                  <Stat
                    label="This week"
                    value={`${weekCount}/7`}
                    color={color}
                  />
                  <Stat label="Total" value={total} color="var(--ink)" />
                </div>

                {/* Calendar */}
                <Calendar
                  checkins={checkins}
                  color={color}
                  onToggle={toggleDay}
                />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--paper-2)] shrink-0 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="life-btn life-btn-sm life-btn-ghost"
            >
              {existing ? "Done" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="life-btn life-btn-sm life-btn-primary"
            >
              {existing ? "Save changes" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Stats tile
// ──────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-1 text-[20px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Month-stepping calendar
// ──────────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function Calendar({
  checkins,
  color,
  onToggle,
}: {
  checkins: Set<string>;
  color: string;
  onToggle: (key: string) => void;
}) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Cursor points at the FIRST of the month currently displayed.
  const [cursor, setCursor] = useState(() => {
    const c = new Date(today);
    c.setDate(1);
    return c;
  });

  function shiftMonth(delta: number) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + delta);
    setCursor(next);
  }

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const atCurrentMonth =
    cursor.getFullYear() === today.getFullYear() &&
    cursor.getMonth() === today.getMonth();

  // Build day grid: leading blanks for the days before the 1st, then the
  // month, padded out to a multiple of 7 with trailing blanks.
  const cells = useMemo(() => buildMonthCells(cursor), [cursor]);

  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)] p-4">
      <header className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} strokeWidth={1.6} />
        </button>
        <div className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={atCurrentMonth}
          className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight size={14} strokeWidth={1.6} />
        </button>
      </header>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)] text-center mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <span key={`b${i}`} className="aspect-square" />;
          const key = cell.key;
          const done = checkins.has(key);
          const isToday = key === ymd(today);
          const isFuture = key > ymd(today);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              disabled={isFuture}
              title={key}
              className="aspect-square rounded-[6px] text-[11.5px] font-medium tabular-nums grid place-items-center transition disabled:cursor-not-allowed"
              style={{
                border: `1.4px solid ${done ? color : "var(--line-2)"}`,
                background: done ? color : "transparent",
                color: done ? "var(--paper)" : isFuture ? "var(--muted-2)" : "var(--ink-2)",
                opacity: isFuture ? 0.35 : 1,
                boxShadow:
                  isToday && !done
                    ? `inset 0 0 0 1.4px ${color}`
                    : undefined,
              }}
            >
              {done ? <Check size={12} strokeWidth={2.5} /> : cell.day}
            </button>
          );
        })}
      </div>

      {!atCurrentMonth && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              const c = new Date(today);
              c.setDate(1);
              setCursor(c);
            }}
            className="text-[11px] text-[var(--muted)] hover:text-[var(--terra)] transition"
          >
            Jump to this month
          </button>
        </div>
      )}
    </div>
  );
}

type Cell = { day: number; key: string } | null;

function buildMonthCells(monthStart: Date): Cell[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0 = Sun
  const lead = dow === 0 ? 6 : dow - 1; // Monday-anchored
  const last = new Date(year, month + 1, 0).getDate();

  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month, d);
    cells.push({ day: d, key: ymd(date) });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
