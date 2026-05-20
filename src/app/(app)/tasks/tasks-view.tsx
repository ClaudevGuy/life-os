"use client";

import { useRef, useState, useTransition } from "react";
import type { StoredItem as Item } from "@/lib/store/items";
import { updateItem, captureItem } from "@/lib/store/items";
import { TaskRow } from "./task-row";
import { TaskEditDialog } from "./task-edit-dialog";
import { LayoutList, KanbanSquare, Check, Repeat, Pencil } from "lucide-react";

type Tab = "all" | "today" | "overdue" | "done";
type View = "list" | "board";

export function TasksView({ rows }: { rows: Item[] }) {
  const [tab, setTab] = useState<Tab>("all");
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
        <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-soft)] p-0.5">
          {(["all", "today", "overdue", "done"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-md text-xs capitalize transition ${
                tab === t
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-soft)] p-0.5">
          <ViewButton current={view} target="board" onClick={setView} icon={KanbanSquare} />
          <ViewButton current={view} target="list" onClick={setView} icon={LayoutList} />
        </div>
      </div>

      <div className="mt-4">
        {view === "list" ? (
          <ListView rows={filtered} isDoneTab={tab === "done"} onEdit={setEditing} />
        ) : (
          <BoardView rows={filtered} onEdit={setEditing} isDoneTab={tab === "done"} />
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
  icon: React.ComponentType<{ size?: number }>;
}) {
  const active = current === target;
  return (
    <button
      type="button"
      onClick={() => onClick(target)}
      aria-label={target}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)]"
      }`}
    >
      <Icon size={12} />
      <span className="capitalize">{target}</span>
    </button>
  );
}

function groupParentsAndSubtasks(rows: Item[]) {
  const childrenByParent = new Map<string, Item[]>();
  const roots: Item[] = [];
  for (const r of rows) {
    const parentId = ((r.metadata ?? {}) as { parentId?: string }).parentId;
    if (parentId) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(r);
      childrenByParent.set(parentId, arr);
    } else {
      roots.push(r);
    }
  }
  return { roots, childrenByParent };
}

function ListView({
  rows,
  isDoneTab,
  onEdit,
}: {
  rows: Item[];
  isDoneTab: boolean;
  onEdit: (t: Item) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="life-card p-6 text-center text-sm text-[var(--text-faint)]">
        Nothing here.
      </div>
    );
  }
  if (isDoneTab) {
    return (
      <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
        {rows.map((t) => (
          <TaskRow key={t.id} task={t} done compact onEdit={() => onEdit(t)} />
        ))}
      </div>
    );
  }

  const order: Array<"high" | "medium" | "low" | "none"> = [
    "high",
    "medium",
    "low",
    "none",
  ];
  const byP: Record<string, Item[]> = { high: [], medium: [], low: [], none: [] };
  for (const r of rows) {
    const p = (((r.metadata ?? {}) as { priority?: string }).priority ?? "none") as keyof typeof byP;
    (byP[p] ?? byP.none).push(r);
  }

  return (
    <div className="space-y-4">
      {order.map((p) => {
        const list = byP[p];
        if (list.length === 0) return null;
        const { roots, childrenByParent } = groupParentsAndSubtasks(list);
        return (
          <section key={p}>
            <h2 className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: priorityColor(p) }}
              />
              {p === "none" ? "Unprioritized" : p}
              <span className="text-[var(--text-faint)] font-mono">·</span>
              <span className="text-[var(--text-muted)] tabular-nums">{list.length}</span>
            </h2>
            <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
              {roots.map((t) => (
                <div key={t.id}>
                  <TaskRow task={t} compact onEdit={() => onEdit(t)} />
                  {(childrenByParent.get(t.id) ?? []).map((child) => (
                    <TaskRow
                      key={child.id}
                      task={child}
                      compact
                      indent
                      onEdit={() => onEdit(child)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardView({
  rows,
  onEdit,
  isDoneTab,
}: {
  rows: Item[];
  onEdit: (t: Item) => void;
  isDoneTab: boolean;
}) {
  const cols: Array<{ key: "high" | "medium" | "low"; label: string }> = [
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];
  const byP: Record<string, Item[]> = { high: [], medium: [], low: [] };
  const unprioritized: Item[] = [];
  for (const r of rows) {
    const p = ((r.metadata ?? {}) as { priority?: string }).priority;
    if (p === "high" || p === "medium" || p === "low") byP[p].push(r);
    else unprioritized.push(r);
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
            isDoneTab={isDoneTab}
          />
        ))}
      </div>
      {unprioritized.length > 0 && (
        <BoardColumn
          label="Unprioritized"
          priority="none"
          tasks={unprioritized}
          onEdit={onEdit}
          isDoneTab={isDoneTab}
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
  isDoneTab,
  wide,
}: {
  label: string;
  priority: "high" | "medium" | "low" | "none";
  tasks: Item[];
  onEdit: (t: Item) => void;
  isDoneTab: boolean;
  wide?: boolean;
}) {
  const color = priorityColor(priority);
  return (
    <div
      className="life-card p-3.5 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, color-mix(in oklab, ${color} 5%, var(--bg-card)) 0%, var(--bg-card) 60%)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <header className="flex items-center justify-between mb-3">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-medium">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}66` }}
          />
          {label}
        </h3>
        <span className="text-[11px] text-[var(--text-faint)] tabular-nums font-mono">
          {tasks.length}
        </span>
      </header>
      <ul className={`space-y-2 ${wide ? "grid grid-cols-1 md:grid-cols-3 gap-2 space-y-0" : ""}`}>
        {tasks.length === 0 && (
          <li className="text-xs text-[var(--text-faint)] py-6 text-center border border-dashed border-[var(--border-soft)] rounded-md">
            Empty
          </li>
        )}
        {tasks.map((t) => (
          <BoardCard
            key={t.id}
            task={t}
            color={color}
            onEdit={() => onEdit(t)}
            done={isDoneTab}
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
  done,
}: {
  task: Item;
  color: string;
  onEdit: () => void;
  done: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(done);
  const burstRef = useRef<HTMLSpanElement>(null);

  const m = (task.metadata ?? {}) as {
    dueDate?: string;
    completedAt?: string | null;
    recurrence?: string | null;
  };
  const due = m.dueDate ? new Date(m.dueDate) : null;
  const overdue = !isDone && due && due < new Date();

  function fireConfetti() {
    const el = burstRef.current;
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span");
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 24 + Math.random() * 12;
      s.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      s.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
      const hues = ["#d4a866", "#f1c27d", "#6dc8a1", "#e57f9f", "#6aa9ef"];
      s.style.background = hues[i % hues.length];
      el.appendChild(s);
    }
    setTimeout(() => {
      if (el) el.innerHTML = "";
    }, 700);
  }

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !isDone;
    setIsDone(next);
    if (next) fireConfetti();
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
      className="group cursor-pointer rounded-lg border border-[var(--border-soft)] bg-[var(--bg-rail)] p-3 hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] transition relative"
    >
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r"
        style={{ background: color, opacity: 0.55 }}
      />
      <div className="flex items-start gap-2.5 pl-2">
        <div className="relative mt-0.5 shrink-0">
          <span ref={burstRef} className="life-confetti pointer-events-none absolute inset-0" />
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-label={isDone ? "Mark not done" : "Mark done"}
            className={`relative grid place-items-center w-4 h-4 rounded border transition ${
              isDone
                ? "bg-[var(--accent)] border-[var(--accent)] text-zinc-950"
                : "border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]"
            }`}
          >
            {isDone && <Check size={11} strokeWidth={3} />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`text-[13px] leading-snug transition ${
              isDone ? "text-[var(--text-faint)] line-through" : "text-[var(--text)]"
            }`}
          >
            {task.title ?? "untitled"}
          </div>
          {(due || m.recurrence) && !isDone && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wide">
              {m.recurrence && (
                <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                  <Repeat size={10} />
                  {m.recurrence}
                </span>
              )}
              {due && (
                <span
                  className={
                    overdue ? "text-[#ef8b8b]" : "text-[var(--text-faint)]"
                  }
                >
                  {overdue ? "overdue · " : ""}
                  {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          )}
        </div>
        <span
          className="opacity-0 group-hover:opacity-100 transition text-[var(--text-faint)] shrink-0"
          aria-hidden
        >
          <Pencil size={11} />
        </span>
      </div>
    </li>
  );
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

function priorityColor(p: string) {
  return p === "high"
    ? "#ef8b8b"
    : p === "medium"
    ? "var(--accent)"
    : p === "low"
    ? "#6dc8a1"
    : "var(--text-faint)";
}
