"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { captureItem } from "@/lib/store/items";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutGrid,
  Rows3,
  Columns3,
  X,
  Plus,
  ListTodo,
  StickyNote,
  Lightbulb,
} from "lucide-react";

type CalItem = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  isoDate: string; // YYYY-MM-DD the item sits on
  via: "captured" | "due" | "review"; // why it shows up
};

type ViewMode = "month" | "week" | "agenda";

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
    return m;
  }, [items]);

  const today = ymd(new Date());

  function shift(delta: number) {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setDate(d.getDate() + delta * 7);
    setCursor(d);
  }

  function gotoToday() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    if (view === "month") d.setDate(1);
    setCursor(d);
    // Always also reveal today's items so the click does something visible
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

      <div className="mt-4">
        {view === "month" && (
          <MonthGrid
            cursor={cursor}
            today={today}
            itemsByDay={itemsByDay}
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

  const todayDate = new Date();
  const onCurrentMonth =
    cursor.getFullYear() === todayDate.getFullYear() &&
    cursor.getMonth() === todayDate.getMonth();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex items-center justify-center rounded-md w-8 h-8 hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
          aria-label="Previous"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={onToday}
          title={
            onCurrentMonth
              ? `Open today (${todayDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })})`
              : "Jump to today"
          }
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-[var(--text-muted)] border border-[var(--border-soft)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
        >
          <span className="font-medium">Today</span>
          <span className="text-[10px] tabular-nums text-[var(--text-faint)] group-hover:text-[var(--accent)]">
            {todayDate.getDate()}
          </span>
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center rounded-md w-8 h-8 hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
          aria-label="Next"
        >
          <ChevronRight size={16} />
        </button>
        <span className="ml-2 text-sm font-semibold text-[var(--text)]">
          {label}
        </span>
      </div>

      <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-soft)] p-0.5">
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
  icon: React.ComponentType<{ size?: number }>;
  onClick: (v: ViewMode) => void;
}) {
  const active = current === target;
  return (
    <button
      type="button"
      onClick={() => onClick(target)}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// ---------- month view ----------

function MonthGrid({
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
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(
    cursor.getFullYear(),
    cursor.getMonth() + 1,
    0,
  ).getDate();

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c.date) return <div key={i} />;
          const iso = ymd(c.date);
          const dayItems = itemsByDay.get(iso) ?? [];
          const isToday = iso === today;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={`text-left min-h-[96px] rounded-lg border p-2 transition ${
                isToday
                  ? "border-[var(--accent)] bg-[var(--accent-glow)]"
                  : "border-[var(--border-soft)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-xs tabular-nums ${
                    isToday
                      ? "text-[var(--accent)] font-semibold"
                      : "text-[var(--text-faint)]"
                  }`}
                >
                  {c.date.getDate()}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[9px] text-[var(--text-faint)] tabular-nums">
                    {dayItems.length}
                  </span>
                )}
              </div>
              <ul className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map((it) => (
                  <li key={`${it.id}-${it.via}`} className="flex items-center gap-1.5">
                    <span
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ background: `var(--kind-${it.kind})` }}
                    />
                    <span className="text-[10px] text-[var(--text-muted)] truncate">
                      {it.title ?? "untitled"}
                    </span>
                  </li>
                ))}
                {dayItems.length > 3 && (
                  <li className="text-[10px] text-[var(--text-faint)]">
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
            className={`text-left min-h-[260px] rounded-lg border p-3 transition ${
              isToday
                ? "border-[var(--accent)] bg-[var(--accent-glow)]"
                : "border-[var(--border-soft)] bg-[var(--bg-card)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
              {d.toLocaleDateString(undefined, { weekday: "short" })}
            </div>
            <div
              className={`mt-1 text-lg font-semibold tabular-nums ${
                isToday ? "text-[var(--accent)]" : "text-[var(--text)]"
              }`}
            >
              {d.getDate()}
            </div>
            <ul className="mt-2 space-y-1">
              {dayItems.map((it) => (
                <li key={`${it.id}-${it.via}`} className="flex items-start gap-1.5">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: `var(--kind-${it.kind})` }}
                  />
                  <span className="text-[11px] text-[var(--text-muted)] truncate">
                    {it.title ?? "untitled"}
                  </span>
                </li>
              ))}
              {dayItems.length === 0 && (
                <li className="text-[10px] text-[var(--text-faint)]">—</li>
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
  // Show items from cursor forward, plus 14 days
  const days = Array.from({ length: 21 }).map((_, i) => {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    return d;
  });
  const populated = days
    .map((d) => ({ d, iso: ymd(d), items: itemsByDay.get(ymd(d)) ?? [] }))
    .filter(({ items }) => items.length > 0);

  if (populated.length === 0) {
    return (
      <div className="life-card p-6 text-center text-sm text-[var(--text-faint)]">
        Nothing scheduled in the next three weeks.
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
                  isToday ? "text-[var(--accent)]" : "text-[var(--text)]"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                {d.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                })}
                {isToday && (
                  <span className="ml-2 text-[var(--accent)]">· today</span>
                )}
              </div>
              <span className="ml-auto text-[10px] text-[var(--text-faint)] tabular-nums">
                {items.length}
              </span>
            </div>
            <ul className="mt-3 space-y-1">
              {items.map((it) => (
                <li key={`${it.id}-${it.via}`} className="flex items-center gap-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: `var(--kind-${it.kind})` }}
                  />
                  <span className="text-sm text-[var(--text)] truncate">
                    {it.title ?? "untitled"}
                  </span>
                  {it.via !== "captured" && (
                    <span className="text-[10px] uppercase tracking-wide text-[var(--accent)]">
                      · {it.via}
                    </span>
                  )}
                </li>
              ))}
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
  const [open, setOpen] = useState<"task" | "note" | "decision" | null>(null);

  const date = new Date(`${day}T12:00:00`);
  const label = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isToday = day === ymd(new Date());
  const isPast = date < new Date() && !isToday;

  function quickCreate(kind: "task" | "note" | "decision", title: string) {
    if (!title.trim()) return;
    startTransition(async () => {
      const metadata: Record<string, unknown> = {};
      if (kind === "task") {
        metadata.dueDate = new Date(`${day}T09:00:00`).toISOString();
        metadata.priority = "medium";
        metadata.completedAt = null;
      } else if (kind === "decision") {
        metadata.reviewAt = new Date(`${day}T09:00:00`).toISOString();
        metadata.outcome = "pending";
      }
      try {
        await captureItem({ kind, title: title.trim(), metadata });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Added");
      setOpen(null);
    });
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] bg-[var(--bg-card)] border-l border-[var(--border-strong)] shadow-2xl overflow-y-auto life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-[var(--bg-card)]/95 backdrop-blur border-b border-[var(--border-soft)] px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              {isToday ? "today" : isPast ? "past" : "upcoming"}
            </div>
            <h3 className="text-sm font-semibold text-[var(--text)] mt-0.5">{label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          <h4 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-2">
            On this day · {items.length}
          </h4>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--text-faint)]">Nothing yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((it) => (
                <li key={`${it.id}-${it.via}`}>
                  <Link
                    href={`/items/${it.id}`}
                    className="block rounded-md p-2 hover:bg-[var(--bg-card-hover)] transition"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: `var(--kind-${it.kind})` }}
                      />
                      <span className="text-sm text-[var(--text)] truncate">
                        {it.title ?? "untitled"}
                      </span>
                      {it.via !== "captured" && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--accent)]">
                          {it.via}
                        </span>
                      )}
                    </div>
                    {it.summary && (
                      <p className="mt-0.5 ml-3.5 text-xs text-[var(--text-muted)] line-clamp-1">
                        {it.summary}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[var(--border-soft)]">
          <h4 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
            Quick add for this day
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <QuickAddBtn
              icon={ListTodo}
              label="Task"
              onClick={() => setOpen("task")}
              active={open === "task"}
            />
            <QuickAddBtn
              icon={StickyNote}
              label="Note"
              onClick={() => setOpen("note")}
              active={open === "note"}
            />
            <QuickAddBtn
              icon={Lightbulb}
              label="Decision"
              onClick={() => setOpen("decision")}
              active={open === "decision"}
            />
          </div>

          {open && (
            <QuickAddInput
              kind={open}
              pending={pending}
              onSubmit={(t) => quickCreate(open, t)}
              onCancel={() => setOpen(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAddBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs transition ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "bg-[var(--bg-rail)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)]"
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function QuickAddInput({
  kind,
  pending,
  onSubmit,
  onCancel,
}: {
  kind: "task" | "note" | "decision";
  pending: boolean;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(text);
          if (e.key === "Escape") onCancel();
        }}
        placeholder={
          kind === "task"
            ? "Task due that day…"
            : kind === "decision"
            ? "Decision to review that day…"
            : "Note title…"
        }
        className="flex-1 rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
      <button
        type="button"
        disabled={pending || !text.trim()}
        onClick={() => onSubmit(text)}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-2 text-xs font-medium hover:brightness-110 transition disabled:opacity-30"
      >
        <Plus size={12} />
        Add
      </button>
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

function weekLabel(d: Date) {
  const sunday = new Date(d);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const s = sunday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const e = saturday.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${s} – ${e}`;
}
