"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { captureItem } from "@/lib/store/items";
import {
  useDayNote,
  useDayNoteDates,
  saveDayNote,
} from "@/lib/store/day-notes";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Rows3,
  Columns3,
  X,
  Plus,
  Bell,
  CalendarDays,
  NotebookPen,
  PenLine,
  Check,
} from "lucide-react";

export type CalEventType =
  | "reminder"
  | "task"
  | "deadline"
  | "subscription"
  | "birthday";

export type CalItem = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  isoDate: string; // YYYY-MM-DD the item sits on
  time: string | null; // "HH:MM" for timed items, else all-day
  type: CalEventType;
  status: string; // "archived" → struck-through (also used for completed)
  href: string;
  meta: string | null; // small trailing label, e.g. "$9.99" / "turns 30"
};

const EVENT_META: Record<CalEventType, { label: string; color: string }> = {
  reminder: { label: "Reminder", color: "var(--terra)" },
  task: { label: "Task", color: "var(--sky)" },
  deadline: { label: "Deadline", color: "var(--sage)" },
  subscription: { label: "Renewal", color: "var(--gold)" },
  birthday: { label: "Birthday", color: "var(--plum)" },
};

type ViewMode = "month" | "week" | "agenda";

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

export function CalendarView({ items }: { items: CalItem[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [view, setView] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const itemsByDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const it of items) {
      const arr = m.get(it.isoDate) ?? [];
      arr.push(it);
      m.set(it.isoDate, arr);
    }
    // Sort each day: timed first (by time), then all-day; archived last.
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const aDone = a.status === "archived" ? 1 : 0;
        const bDone = b.status === "archived" ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        const at = a.time ?? "99:99";
        const bt = b.time ?? "99:99";
        return at.localeCompare(bt);
      });
    }
    return m;
  }, [items]);

  const presentTypes = useMemo(() => {
    const set = new Set<CalEventType>();
    for (const it of items) set.add(it.type);
    return (Object.keys(EVENT_META) as CalEventType[]).filter((t) =>
      set.has(t),
    );
  }, [items]);

  const today = ymd(new Date());
  const noteDates = useDayNoteDates() ?? EMPTY_SET;

  function shift(delta: number) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else d.setDate(d.getDate() + delta * 7);
    setCursor(d);
  }

  function gotoToday() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    if (view === "month") d.setDate(1);
    setCursor(d);
    setSelectedDay(today);
  }

  return (
    <div>
      <Toolbar
        cursor={cursor}
        view={view}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onToday={gotoToday}
        onView={setView}
      />

      {presentTypes.length > 0 && <Legend types={presentTypes} />}

      <div className="mt-3">
        {view === "month" && (
          <MonthGrid
            cursor={cursor}
            today={today}
            itemsByDay={itemsByDay}
            noteDates={noteDates}
            onSelectDay={setSelectedDay}
          />
        )}
        {view === "week" && (
          <WeekStrip
            cursor={cursor}
            today={today}
            itemsByDay={itemsByDay}
            onSelectDay={setSelectedDay}
          />
        )}
        {view === "agenda" && (
          <Agenda
            cursor={cursor}
            today={today}
            itemsByDay={itemsByDay}
            onSelectDay={setSelectedDay}
          />
        )}
      </div>

      {selectedDay && (
        <DayDrawer
          day={selectedDay}
          items={itemsByDay.get(selectedDay) ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

// ---------- legend ----------

function Legend({ types }: { types: CalEventType[] }) {
  return (
    <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap mb-4">
      {types.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: EVENT_META[t].color }}
          />
          {EVENT_META[t].label}
        </span>
      ))}
    </div>
  );
}

// ---------- toolbar ----------

function Toolbar({
  cursor,
  view,
  onPrev,
  onNext,
  onToday,
  onView,
}: {
  cursor: Date;
  view: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onView: (v: ViewMode) => void;
}) {
  const label =
    view === "month"
      ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "week"
        ? weekLabel(cursor)
        : `Agenda from ${cursor.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="inline-flex items-center gap-3">
        <div className="inline-flex items-center gap-0.5 p-1 rounded-[10px] bg-[var(--paper)] border border-[var(--line)]">
          <button
            type="button"
            onClick={onPrev}
            className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            aria-label="Previous"
          >
            <ChevronLeft size={14} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="px-3 py-1 rounded-[7px] text-[12.5px] font-medium text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            aria-label="Next"
          >
            <ChevronRight size={14} strokeWidth={1.6} />
          </button>
        </div>
        <span className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          {label}
        </span>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper)] border border-[var(--line)]">
        <ViewBtn current={view} target="month" label="Month" icon={LayoutGrid} onClick={onView} />
        <ViewBtn current={view} target="week" label="Week" icon={Columns3} onClick={onView} />
        <ViewBtn current={view} target="agenda" label="Agenda" icon={Rows3} onClick={onView} />
      </div>
    </div>
  );
}

function ViewBtn({
  current,
  target,
  label,
  icon: Icon,
  onClick,
}: {
  current: ViewMode;
  target: ViewMode;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  onClick: (v: ViewMode) => void;
}) {
  const active = current === target;
  return (
    <button
      type="button"
      onClick={() => onClick(target)}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[7px] text-[12.5px] font-medium transition ${
        active
          ? "bg-[var(--paper-2)] text-[var(--ink)]"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
      style={active ? { boxShadow: "var(--shadow-1)" } : undefined}
    >
      <Icon size={13} strokeWidth={1.6} />
      {label}
    </button>
  );
}

// ---------- event chip ----------

function EventChip({ it }: { it: CalItem }) {
  const archived = it.status === "archived";
  const color = archived ? "var(--muted-2)" : EVENT_META[it.type].color;
  return (
    <span
      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-[5px] min-w-0"
      style={{
        background: archived
          ? "transparent"
          : `color-mix(in oklch, ${color} 15%, transparent)`,
      }}
    >
      <span
        className="w-1 h-1 rounded-full shrink-0"
        style={{ background: color }}
      />
      {it.time && !archived && (
        <span
          className="text-[9.5px] font-mono tabular-nums shrink-0"
          style={{ color }}
        >
          {fmtTime(it.time)}
        </span>
      )}
      <span
        className={`text-[10.5px] truncate ${
          archived ? "line-through text-[var(--muted-2)]" : "text-[var(--ink-2)]"
        }`}
      >
        {it.title ?? "untitled"}
      </span>
    </span>
  );
}

// ---------- month view ----------

function MonthGrid({
  cursor,
  today,
  itemsByDay,
  noteDates,
  onSelectDay,
}: {
  cursor: Date;
  today: string;
  itemsByDay: Map<string, CalItem[]>;
  noteDates: ReadonlySet<string>;
  onSelectDay: (day: string) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();

  const cells: Array<{ date: Date; outside: boolean }> = [];
  if (startDay > 0) {
    const prevMonthDays = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      0,
    ).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({
        date: new Date(
          cursor.getFullYear(),
          cursor.getMonth() - 1,
          prevMonthDays - i,
        ),
        outside: true,
      });
    }
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth(), d),
      outside: false,
    });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, outside: true });
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] px-2 py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c, i) => {
          const iso = ymd(c.date);
          const dayItems = itemsByDay.get(iso) ?? [];
          const isToday = iso === today;
          const hasNote = noteDates.has(iso);
          const dow = c.date.getDay();
          const weekend = dow === 0 || dow === 6;
          const cellTime = new Date(c.date);
          cellTime.setHours(0, 0, 0, 0);
          const isPast = !isToday && cellTime.getTime() < todayDate.getTime();

          return (
            <button
              key={`${iso}-${i}`}
              type="button"
              onClick={() => onSelectDay(iso)}
              className="group text-left min-h-[112px] rounded-[10px] border p-2.5 transition relative overflow-hidden hover:border-[var(--line-2)]"
              style={{
                background: isToday
                  ? "color-mix(in oklch, var(--terra-tint) 55%, var(--paper))"
                  : c.outside
                    ? "transparent"
                    : weekend
                      ? "color-mix(in oklch, var(--bg-2) 45%, var(--paper))"
                      : "var(--paper)",
                borderColor: isToday
                  ? "color-mix(in oklch, var(--terra) 35%, transparent)"
                  : "var(--line)",
                opacity: c.outside ? 0.45 : isPast ? 0.82 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-1.5">
                {isToday ? (
                  <span
                    className="grid place-items-center w-[22px] h-[22px] rounded-full text-[11.5px] tabular-nums font-semibold"
                    style={{ background: "var(--terra)", color: "var(--paper)" }}
                  >
                    {c.date.getDate()}
                  </span>
                ) : (
                  <span
                    className="text-[12.5px] tabular-nums font-semibold pl-0.5"
                    style={{
                      color: c.outside
                        ? "var(--muted-2)"
                        : isPast
                          ? "var(--muted)"
                          : "var(--ink-2)",
                    }}
                  >
                    {c.date.getDate()}
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {hasNote && (
                    <PenLine
                      size={11}
                      strokeWidth={1.8}
                      style={{ color: "var(--terra)" }}
                    />
                  )}
                  {dayItems.length > 0 && (
                    <span className="text-[9.5px] tabular-nums font-mono font-semibold px-1.5 py-px rounded-full bg-[var(--bg-2)] text-[var(--muted)]">
                      {dayItems.length}
                    </span>
                  )}
                </div>
              </div>
              <ul className="mt-1.5 space-y-1">
                {dayItems.slice(0, 3).map((it) => (
                  <li key={`${it.id}-${it.type}-${it.isoDate}`}>
                    <EventChip it={it} />
                  </li>
                ))}
                {dayItems.length > 3 && (
                  <li className="text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--muted-2)] pl-1.5">
                    +{dayItems.length - 3} more
                  </li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- week view ----------

function WeekStrip({
  cursor,
  today,
  itemsByDay,
  onSelectDay,
}: {
  cursor: Date;
  today: string;
  itemsByDay: Map<string, CalItem[]>;
  onSelectDay: (day: string) => void;
}) {
  const sunday = new Date(cursor);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const iso = ymd(d);
        const isToday = iso === today;
        const dayItems = itemsByDay.get(iso) ?? [];
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelectDay(iso)}
            className="text-left min-h-[280px] rounded-[10px] border p-3 transition"
            style={{
              borderColor: isToday
                ? "color-mix(in oklch, var(--terra) 35%, transparent)"
                : "var(--line)",
              background: isToday
                ? "color-mix(in oklch, var(--terra-tint) 50%, var(--paper))"
                : "var(--paper)",
            }}
          >
            <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div
              className={`mt-1 text-lg font-semibold tabular-nums ${
                isToday ? "text-[var(--terra)]" : "text-[var(--ink)]"
              }`}
            >
              {d.getDate()}
            </div>
            <ul className="mt-2 space-y-1">
              {dayItems.map((it) => (
                <li key={`${it.id}-${it.type}-${it.isoDate}`}>
                  <EventChip it={it} />
                </li>
              ))}
              {dayItems.length === 0 && (
                <li className="text-[10px] text-[var(--muted-2)]">—</li>
              )}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

// ---------- agenda view ----------

function Agenda({
  cursor,
  today,
  itemsByDay,
  onSelectDay,
}: {
  cursor: Date;
  today: string;
  itemsByDay: Map<string, CalItem[]>;
  onSelectDay: (day: string) => void;
}) {
  const days = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    return d;
  });
  const populated = days
    .map((d) => ({ d, iso: ymd(d), items: itemsByDay.get(ymd(d)) ?? [] }))
    .filter(({ items }) => items.length > 0);

  if (populated.length === 0) {
    return (
      <div className="life-card p-6 text-center text-sm text-[var(--muted)]">
        Nothing scheduled in the next four weeks.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {populated.map(({ d, iso, items }) => {
        const isToday = iso === today;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onSelectDay(iso)}
            className="w-full text-left life-card life-card-hover p-4 transition"
          >
            <div className="flex items-baseline gap-3">
              <div
                className={`text-2xl font-semibold tabular-nums ${
                  isToday ? "text-[var(--terra)]" : "text-[var(--ink)]"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {d.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                })}
                {isToday && (
                  <span className="ml-2 text-[var(--terra)]">· today</span>
                )}
              </div>
              <span className="ml-auto text-[10px] text-[var(--muted-2)] tabular-nums">
                {items.length}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {items.map((it) => {
                const archived = it.status === "archived";
                const color = archived
                  ? "var(--muted-2)"
                  : EVENT_META[it.type].color;
                return (
                  <li
                    key={`${it.id}-${it.type}-${it.isoDate}`}
                    className="flex items-center gap-2"
                  >
                    {it.time && !archived ? (
                      <span
                        className="text-[11px] font-mono tabular-nums w-10 shrink-0 text-right"
                        style={{ color }}
                      >
                        {fmtTime(it.time)}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--muted-2)] w-10 shrink-0 text-right">
                        {archived ? "" : "all-day"}
                      </span>
                    )}
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span
                      className={`text-sm truncate ${
                        archived
                          ? "line-through text-[var(--muted)]"
                          : "text-[var(--ink)]"
                      }`}
                    >
                      {it.title ?? "untitled"}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-wide ml-1 shrink-0"
                      style={{ color: archived ? "var(--muted-2)" : color }}
                    >
                      {archived ? "done" : EVENT_META[it.type].label}
                    </span>
                    {it.meta && !archived && (
                      <span className="ml-auto text-[11px] tabular-nums text-[var(--muted)] shrink-0">
                        {it.meta}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

// ---------- day drawer ----------

function DayDrawer({
  day,
  items,
  onClose,
}: {
  day: string;
  items: CalItem[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [reminderTime, setReminderTime] = useState("09:00");

  const date = new Date(`${day}T12:00:00`);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const longLabel = date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isToday = day === ymd(new Date());
  const isPast = date < new Date() && !isToday;

  function quickCreateReminder(title: string) {
    if (!title.trim()) return;
    startTransition(async () => {
      const [h, m] = reminderTime.split(":");
      const due = new Date(
        `${day}T${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}:00`,
      );
      try {
        await captureItem({
          kind: "task",
          title: title.trim(),
          status: "active",
          metadata: {
            dueDate: due.toISOString(),
            priority: "medium",
            completedAt: null,
            reminder: true,
          },
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Reminder set");
    });
  }

  const tag = isToday ? "Today" : isPast ? "Past" : "Upcoming";
  const tagColor = isToday ? "var(--terra)" : "var(--muted)";
  const accent = isToday ? "var(--terra)" : "var(--sky)";

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] bg-[var(--paper)] border-l border-[var(--line-2)] shadow-2xl overflow-y-auto life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with a soft tint */}
        <div className="relative border-b border-[var(--line)] overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklch, ${accent} 16%, var(--paper)) 0%, var(--paper) 72%)`,
            }}
          />
          <div className="relative px-5 pt-4 pb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-[0.16em] font-semibold"
                  style={{ color: tagColor }}
                >
                  {tag}
                </span>
                {items.length > 0 && (
                  <span className="text-[10px] text-[var(--muted-2)] font-mono">
                    · {items.length} event{items.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <h3 className="mt-1 text-[21px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-tight">
                {weekday}
              </h3>
              <div className="text-[13px] text-[var(--muted)]">{longLabel}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* On this day */}
        <DrawerSection icon={CalendarDays} title="On this day" count={items.length} first>
          {items.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)]">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-0.5">
              {items.map((it) => {
                const archived = it.status === "archived";
                const color = archived
                  ? "var(--muted-2)"
                  : EVENT_META[it.type].color;
                return (
                  <li key={`${it.id}-${it.type}-${it.isoDate}`}>
                    <Link
                      href={it.href}
                      className="block rounded-md p-2 -mx-1 hover:bg-[var(--paper-2)] transition"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        {it.time && !archived && (
                          <span
                            className="text-[11px] font-mono tabular-nums shrink-0"
                            style={{ color }}
                          >
                            {fmtTime(it.time)}
                          </span>
                        )}
                        <span
                          className={`text-sm truncate ${
                            archived
                              ? "line-through text-[var(--muted)]"
                              : "text-[var(--ink)]"
                          }`}
                        >
                          {it.title ?? "untitled"}
                        </span>
                        <span
                          className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wide shrink-0"
                          style={{ color: archived ? "var(--muted-2)" : color }}
                        >
                          {it.type === "reminder" && <Bell size={9} />}
                          {archived ? "done" : EVENT_META[it.type].label}
                        </span>
                      </div>
                      {(it.summary || it.meta) && (
                        <p className="mt-0.5 ml-3.5 text-xs text-[var(--muted)] line-clamp-1">
                          {it.meta ?? it.summary}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </DrawerSection>

        {/* Day notes — the scratchpad */}
        <DrawerSection icon={NotebookPen} title="Notes" iconColor="var(--sky)">
          <DayNoteEditor key={day} date={day} />
        </DrawerSection>

        {/* Add a reminder */}
        <DrawerSection icon={Bell} title="Add a reminder" iconColor="var(--terra)">
          <QuickAddReminder
            pending={pending}
            onSubmit={quickCreateReminder}
            reminderTime={reminderTime}
            onReminderTimeChange={setReminderTime}
          />
        </DrawerSection>
      </div>
    </div>
  );
}

function DrawerSection({
  icon: Icon,
  title,
  count,
  iconColor,
  first,
  children,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  count?: number;
  iconColor?: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`px-5 py-4 ${first ? "" : "border-t border-[var(--line)]"}`}
    >
      <h4 className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted-2)] mb-3 inline-flex items-center gap-1.5">
        <Icon size={11} style={{ color: iconColor ?? "var(--muted)" }} />
        {title}
        {count != null && (
          <span className="text-[var(--muted-2)] font-mono">· {count}</span>
        )}
      </h4>
      {children}
    </section>
  );
}

function DayNoteEditor({ date }: { date: string }) {
  const existing = useDayNote(date);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const seeded = useRef(false);
  const bodyRef = useRef("");
  bodyRef.current = body;
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  // Seed once the stored note has loaded.
  useEffect(() => {
    if (!seeded.current && existing !== undefined) {
      setBody(existing?.body ?? "");
      seeded.current = true;
    }
  }, [existing]);

  // Flush any pending edit if the drawer closes mid-type.
  useEffect(() => {
    return () => {
      if (dirty.current) void saveDayNote(date, bodyRef.current);
    };
  }, [date]);

  function onChange(v: string) {
    setBody(v);
    dirty.current = true;
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void saveDayNote(date, bodyRef.current).then(() => {
        dirty.current = false;
        setStatus("saved");
      });
    }, 700);
  }

  function flush() {
    if (timer.current) window.clearTimeout(timer.current);
    if (dirty.current) {
      void saveDayNote(date, bodyRef.current).then(() => {
        dirty.current = false;
        setStatus("saved");
      });
    }
  }

  return (
    <div>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        onBlur={flush}
        rows={6}
        placeholder="Talking points, things to remember, anything tied to this day…"
        className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2.5 text-[13.5px] leading-relaxed text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] resize-y transition"
      />
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--muted-2)]">
        <span>Saved to this day · autosaves</span>
        <span className="inline-flex items-center gap-1">
          {status === "saving" && "Saving…"}
          {status === "saved" && (
            <>
              <Check size={11} style={{ color: "var(--sage)" }} />
              Saved
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function QuickAddReminder({
  pending,
  onSubmit,
  reminderTime,
  onReminderTimeChange,
}: {
  pending: boolean;
  onSubmit: (title: string) => void;
  reminderTime: string;
  onReminderTimeChange: (t: string) => void;
}) {
  const [text, setText] = useState("");
  function submit() {
    if (!text.trim()) return;
    onSubmit(text);
    setText("");
  }
  return (
    <div className="mt-3 space-y-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Remind me to…"
        className="w-full rounded-md bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
      />
      <div className="flex items-center gap-2">
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => onReminderTimeChange(e.target.value)}
          className="rounded-md bg-[var(--paper-2)] border border-[var(--line)] px-2 py-2 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition tabular-nums"
          title="Time for the reminder"
        />
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={submit}
          className="life-btn life-btn-primary ml-auto"
        >
          <Plus size={12} strokeWidth={3} />
          Set reminder
        </button>
      </div>
      <p className="text-[11px] leading-snug text-[var(--muted-2)] px-1">
        Shows up in Today and on this day — kept out of the Tasks list.
      </p>
    </div>
  );
}

// ---------- helpers ----------

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTime(t: string): string {
  const [hRaw, mRaw] = t.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (isNaN(h)) return t;
  const ap = h < 12 ? "a" : "p";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${m.toString().padStart(2, "0")}${ap}`;
}

function weekLabel(d: Date) {
  const sunday = new Date(d);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const s = sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const e = saturday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${s} – ${e}`;
}
