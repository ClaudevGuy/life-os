"use client";

import { useRef, useState, useTransition } from "react";
import type { StoredItem as Item } from "@/lib/store/items";
import { updateItem, captureItem } from "@/lib/store/items";
import { TaskEditDialog } from "./task-edit-dialog";
import { LayoutList, KanbanSquare, Check, Repeat, Pencil } from "lucide-react";

export type Tab = "all" | "today" | "overdue" | "done";
type View = "list" | "board";
type Priority = "high" | "medium" | "low" | "none";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "var(--terra)",
  medium: "var(--gold)",
  low: "var(--sage)",
  none: "var(--muted-2)",
};
const PRIORITY_TINT: Record<Priority, string> = {
  high: "var(--terra-tint)",
  medium: "var(--gold-tint)",
  low: "var(--sage-tint)",
  none: "var(--bg-2)",
};
const PRIORITY_LABEL: Record<Priority, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
  none: "—",
};

export function TasksView({
  rows,
  tab,
  onTabChange,
}: {
  rows: Item[];
  tab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const [view, setView] = useState<View>("board");
  const [editing, setEditing] = useState<Item | null>(null);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const filtered = rows.filter((t) => {
    const m = (t.metadata ?? {}) as {
      completedAt?: string | null;
      dueDate?: string;
    };
    const done = Boolean(m.completedAt) || t.status === "archived";
    if (tab === "done") return done;
    if (done) return false;
    if (tab === "today") {
      if (!m.dueDate) return false;
      const d = new Date(m.dueDate);
      return d >= startOfToday && d < endOfToday;
    }
    if (tab === "overdue") {
      return m.dueDate ? new Date(m.dueDate) < startOfToday : false;
    }
    return true;
  });

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Tabs */}
        <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper)] border border-[var(--line)]">
          {(["all", "today", "overdue", "done"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={`px-3.5 py-1.5 rounded-[7px] text-[13px] font-medium capitalize transition ${
                tab === t
                  ? "bg-[var(--paper-2)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper)] border border-[var(--line)]">
          <ViewButton current={view} target="board" onClick={setView} icon={KanbanSquare} />
          <ViewButton current={view} target="list" onClick={setView} icon={LayoutList} />
        </div>
      </div>

      <div className="mt-5">
        {view === "list" ? (
          <ListView rows={filtered} onEdit={setEditing} />
        ) : (
          <BoardView rows={filtered} onEdit={setEditing} />
        )}
      </div>

      {editing && (
        <TaskEditDialog task={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ViewButton({
  current,
  target,
  onClick,
  icon: Icon,
}: {
  current: View;
  target: View;
  onClick: (v: View) => void;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  const active = current === target;
  return (
    <button
      type="button"
      onClick={() => onClick(target)}
      aria-label={target}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[13px] font-medium capitalize transition ${
        active
          ? "bg-[var(--paper-2)] text-[var(--ink)]"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      <Icon size={13} strokeWidth={1.6} />
      {target}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// List view
// ──────────────────────────────────────────────────────────────────────

function ListView({
  rows,
  onEdit,
}: {
  rows: Item[];
  onEdit: (t: Item) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="life-card p-8 text-center text-[13px] text-[var(--muted)]">
        Nothing here.
      </div>
    );
  }
  return (
    <div className="life-card overflow-hidden">
      <ul className="divide-y divide-[var(--line)]">
        {rows.map((t) => (
          <ListRow key={t.id} task={t} onEdit={() => onEdit(t)} />
        ))}
      </ul>
    </div>
  );
}

function ListRow({ task, onEdit }: { task: Item; onEdit: () => void }) {
  const m = (task.metadata ?? {}) as {
    dueDate?: string;
    completedAt?: string | null;
    recurrence?: string | null;
    priority?: string;
  };
  const initialDone = Boolean(m.completedAt) || task.status === "archived";
  const priority = (m.priority ?? "none") as Priority;
  const [pending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(initialDone);
  const burstRef = useRef<HTMLSpanElement>(null);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !isDone;
    setIsDone(next);
    if (next) fireConfetti(burstRef.current);
    startTransition(async () => {
      await updateItem(task.id, {
        metadata: { ...m, completedAt: next ? new Date().toISOString() : null },
        status: next ? "archived" : "active",
      });
      if (next && m.recurrence) {
        await captureItem({
          kind: "task",
          title: task.title,
          metadata: {
            ...m,
            completedAt: null,
            dueDate: nextOccurrence(m.recurrence, new Date()).toISOString(),
          },
        });
      }
    });
  }

  const due = m.dueDate ? new Date(m.dueDate) : null;
  const project =
    ((task.metadata ?? {}) as { projectName?: string }).projectName ??
    task.topic ??
    null;
  const dotColor = PRIORITY_COLOR[priority];

  return (
    <li
      onClick={onEdit}
      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--paper-2)] cursor-pointer transition"
    >
      <div className="relative shrink-0">
        <span
          ref={burstRef}
          className="life-confetti pointer-events-none absolute inset-0"
        />
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-label={isDone ? "Mark not done" : "Mark done"}
          className="grid place-items-center w-[22px] h-[22px] rounded-[6px] transition"
          style={{
            border: `1.6px solid ${isDone ? "var(--sage)" : dotColor}`,
            background: isDone ? "var(--sage)" : "transparent",
            color: "var(--paper)",
          }}
        >
          {isDone && <Check size={13} strokeWidth={2.5} />}
        </button>
      </div>
      <span
        className={`flex-1 text-[14.5px] transition ${
          isDone
            ? "text-[var(--muted)] line-through"
            : "text-[var(--ink)]"
        }`}
      >
        {task.title?.trim() ? (
          task.title
        ) : (
          <em className="text-[var(--muted-2)] not-italic">untitled</em>
        )}
      </span>
      <div className="flex items-center gap-5 shrink-0">
        {priority !== "none" && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em]"
            style={{
              color: dotColor,
              background: PRIORITY_TINT[priority],
            }}
          >
            {PRIORITY_LABEL[priority]}
          </span>
        )}
        {project && (
          <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)]">
            {project}
          </span>
        )}
        <span className="text-[11px] tracking-[0.04em] text-[var(--muted-2)] font-mono tabular-nums min-w-[44px] text-right">
          {due ? dueLabel(due) : m.recurrence ?? ""}
        </span>
        <Pencil
          size={12}
          strokeWidth={1.6}
          className="text-[var(--muted-2)] opacity-0 group-hover:opacity-100 transition"
        />
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Board view
// ──────────────────────────────────────────────────────────────────────

function BoardView({
  rows,
  onEdit,
}: {
  rows: Item[];
  onEdit: (t: Item) => void;
}) {
  const cols: Array<{ key: Priority; label: string }> = [
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];
  const byP: Record<string, Item[]> = { high: [], medium: [], low: [], none: [] };
  for (const r of rows) {
    const p = ((r.metadata ?? {}) as { priority?: string }).priority ?? "none";
    (byP[p] ?? byP.none).push(r);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cols.map((col) => (
          <BoardColumn
            key={col.key}
            label={col.label}
            priority={col.key}
            tasks={byP[col.key]}
            onEdit={onEdit}
          />
        ))}
      </div>
      {byP.none.length > 0 && (
        <BoardColumn
          label="Unprioritized"
          priority="none"
          tasks={byP.none}
          onEdit={onEdit}
          wide
        />
      )}
    </div>
  );
}

function BoardColumn({
  label,
  priority,
  tasks,
  onEdit,
  wide,
}: {
  label: string;
  priority: Priority;
  tasks: Item[];
  onEdit: (t: Item) => void;
  wide?: boolean;
}) {
  const color = PRIORITY_COLOR[priority];
  return (
    <div className="life-card p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
          />
          {label}
        </h3>
        <span className="text-[11.5px] text-[var(--muted-2)] tabular-nums font-mono">
          {tasks.length}
        </span>
      </header>
      <ul className={`space-y-2 ${wide ? "grid grid-cols-1 md:grid-cols-3 gap-2 space-y-0" : ""}`}>
        {tasks.length === 0 && (
          <li className="text-[12px] text-[var(--muted-2)] py-6 text-center border border-dashed border-[var(--line-2)] rounded-[10px]">
            Empty
          </li>
        )}
        {tasks.map((t) => (
          <BoardCard
            key={t.id}
            task={t}
            color={color}
            onEdit={() => onEdit(t)}
          />
        ))}
      </ul>
    </div>
  );
}

function BoardCard({
  task,
  color,
  onEdit,
}: {
  task: Item;
  color: string;
  onEdit: () => void;
}) {
  const m = (task.metadata ?? {}) as {
    dueDate?: string;
    completedAt?: string | null;
    recurrence?: string | null;
  };
  const initialDone = Boolean(m.completedAt) || task.status === "archived";
  const [pending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(initialDone);
  const burstRef = useRef<HTMLSpanElement>(null);

  const due = m.dueDate ? new Date(m.dueDate) : null;
  const project =
    ((task.metadata ?? {}) as { projectName?: string }).projectName ??
    task.topic ??
    null;

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !isDone;
    setIsDone(next);
    if (next) fireConfetti(burstRef.current);
    startTransition(async () => {
      await updateItem(task.id, {
        metadata: { ...m, completedAt: next ? new Date().toISOString() : null },
        status: next ? "archived" : "active",
      });
      if (next && m.recurrence) {
        await captureItem({
          kind: "task",
          title: task.title,
          metadata: {
            ...m,
            completedAt: null,
            dueDate: nextOccurrence(m.recurrence, new Date()).toISOString(),
          },
        });
      }
    });
  }

  return (
    <li
      onClick={onEdit}
      className="group cursor-pointer rounded-[10px] bg-[var(--paper-2)] hover:bg-[var(--paper)] p-3.5 flex items-start gap-3 transition"
    >
      <div className="relative shrink-0 mt-0.5">
        <span
          ref={burstRef}
          className="life-confetti pointer-events-none absolute inset-0"
        />
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-label={isDone ? "Mark not done" : "Mark done"}
          className="grid place-items-center w-[20px] h-[20px] rounded-[6px] transition"
          style={{
            border: `1.6px solid ${isDone ? "var(--sage)" : color}`,
            background: isDone ? "var(--sage)" : "transparent",
            color: "var(--paper)",
          }}
        >
          {isDone && <Check size={12} strokeWidth={2.5} />}
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[14px] leading-snug transition ${
            isDone ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"
          }`}
        >
          {task.title?.trim() ? (
            task.title
          ) : (
            <em className="text-[var(--muted-2)] not-italic">untitled</em>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] font-semibold">
          {project && (
            <span className="text-[var(--muted)]">{project}</span>
          )}
          {project && (due || m.recurrence) && (
            <span className="text-[var(--muted-2)]">·</span>
          )}
          {m.recurrence && (
            <span className="inline-flex items-center gap-1 text-[var(--terra)]">
              <Repeat size={10} strokeWidth={1.6} />
              {m.recurrence}
            </span>
          )}
          {due && (
            <span className="text-[var(--muted-2)]">{dueLabel(due)}</span>
          )}
        </div>
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function fireConfetti(el: HTMLSpanElement | null) {
  if (!el) return;
  el.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("span");
    const angle = (Math.PI * 2 * i) / 8;
    const dist = 24 + Math.random() * 12;
    s.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    const hues = ["#D45A3F", "#C8995A", "#7A8B6F", "#6B4E5C", "#6B89A8"];
    s.style.background = hues[i % hues.length];
    el.appendChild(s);
  }
  setTimeout(() => {
    if (el) el.innerHTML = "";
  }, 700);
}

function dueLabel(d: Date): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (d >= start && d < end) return "today";
  const tomorrow = new Date(end);
  tomorrow.setDate(end.getDate() + 1);
  if (d >= end && d < tomorrow) return "tmrw";
  // Same week → weekday short, otherwise mon/day
  const days = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  if (days >= -6 && days <= 6) {
    return d.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase();
  }
  return d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toLowerCase();
}

function nextOccurrence(recurrence: string, from: Date): Date {
  const next = new Date(from);
  if (recurrence === "daily") next.setDate(next.getDate() + 1);
  else if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
  else if (recurrence === "weekdays") {
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() === 0 || next.getDay() === 6);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
