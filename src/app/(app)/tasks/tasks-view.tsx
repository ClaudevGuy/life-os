"use client";

import { useState } from "react";
import type { StoredItem as Item } from "@/lib/store/items";
import { TaskRow } from "./task-row";
import { LayoutList, KanbanSquare } from "lucide-react";

type Tab = "all" | "today" | "overdue" | "done";
type View = "list" | "board";

export function TasksView({ rows }: { rows: Item[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [view, setView] = useState<View>("list");

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
    return true; // all
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
          <ViewButton current={view} target="list" onClick={setView} icon={LayoutList} />
          <ViewButton current={view} target="board" onClick={setView} icon={KanbanSquare} />
        </div>
      </div>

      <div className="mt-4">
        {view === "list" ? (
          <ListView rows={filtered} isDoneTab={tab === "done"} />
        ) : (
          <BoardView rows={filtered} />
        )}
      </div>
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

function ListView({ rows, isDoneTab }: { rows: Item[]; isDoneTab: boolean }) {
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
          <TaskRow key={t.id} task={t} done compact />
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
                  <TaskRow task={t} compact />
                  {(childrenByParent.get(t.id) ?? []).map((child) => (
                    <TaskRow key={child.id} task={child} compact indent />
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

function BoardView({ rows }: { rows: Item[] }) {
  const cols: Array<{ key: "high" | "medium" | "low"; label: string }> = [
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];
  const byP: Record<string, Item[]> = { high: [], medium: [], low: [] };
  for (const r of rows) {
    const p = ((r.metadata ?? {}) as { priority?: string }).priority;
    if (p === "high" || p === "medium" || p === "low") byP[p].push(r);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cols.map((col) => (
        <div key={col.key} className="life-card p-3">
          <header className="flex items-center justify-between mb-3">
            <h3 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: priorityColor(col.key) }}
              />
              {col.label}
            </h3>
            <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
              {byP[col.key].length}
            </span>
          </header>
          <ul className="space-y-1.5">
            {byP[col.key].length === 0 && (
              <li className="text-xs text-[var(--text-faint)] px-2 py-3 text-center">
                Empty
              </li>
            )}
            {byP[col.key].map((t) => (
              <BoardCard key={t.id} task={t} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BoardCard({ task }: { task: Item }) {
  const m = (task.metadata ?? {}) as {
    dueDate?: string;
    completedAt?: string;
    recurrence?: string;
  };
  const due = m.dueDate ? new Date(m.dueDate) : null;
  const overdue = due && due < new Date();
  return (
    <li className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-rail)] p-2.5 hover:border-[var(--border-strong)] transition">
      <div className="text-sm text-[var(--text)] leading-snug">{task.title}</div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wide">
        {m.recurrence && (
          <span className="text-[var(--accent)]">↻ {m.recurrence}</span>
        )}
        {due && (
          <span
            className={
              overdue ? "text-[#ef8b8b]" : "text-[var(--text-faint)]"
            }
          >
            {overdue ? "overdue" : "due"}{" "}
            {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </li>
  );
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
