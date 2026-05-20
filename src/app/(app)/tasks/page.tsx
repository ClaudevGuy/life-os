"use client";

import { useState } from "react";
import { useItemsOfKind } from "@/lib/store/items";
import { ListTodo } from "lucide-react";
import { NewTask } from "./new-task";
import { TasksView, type Tab } from "./tasks-view";

export default function TasksPage() {
  const allTasks = useItemsOfKind("task") ?? [];
  // Reminders are stored as tasks (metadata.reminder = true) so they appear in
  // Today and the calendar, but they shouldn't clutter the Tasks page.
  const rows = allTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { reminder?: boolean };
    return !m.reminder;
  });
  const [tab, setTab] = useState<Tab>("all");

  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const isOpen = (t: (typeof rows)[number]) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return !m.completedAt && t.status !== "archived";
  };
  const isDone = (t: (typeof rows)[number]) => !isOpen(t);

  const open = rows.filter(isOpen);
  const done = rows.filter(isDone);
  const overdue = open.filter((t) => {
    const m = (t.metadata ?? {}) as { dueDate?: string };
    return m.dueDate && new Date(m.dueDate) < startOfToday;
  });
  const dueToday = open.filter((t) => {
    const m = (t.metadata ?? {}) as { dueDate?: string };
    if (!m.dueDate) return false;
    const d = new Date(m.dueDate);
    return d >= startOfToday && d < endOfToday;
  });
  const doneThisWeek = done.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string };
    if (!m.completedAt) return false;
    const completed = new Date(m.completedAt);
    return now.getTime() - completed.getTime() < 7 * 86_400_000;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <ListTodo size={18} className="text-[var(--accent)]" />
            Tasks
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            What needs doing — with stakes, dates, and a clear definition of done.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger">
        <Stat
          label="Open"
          value={open.length}
          tone="default"
          active={tab === "all"}
          onClick={() => setTab("all")}
        />
        <Stat
          label="Overdue"
          value={overdue.length}
          tone="warn"
          active={tab === "overdue"}
          onClick={() => setTab("overdue")}
        />
        <Stat
          label="Due today"
          value={dueToday.length}
          tone="accent"
          active={tab === "today"}
          onClick={() => setTab("today")}
        />
        <Stat
          label="Done this week"
          value={doneThisWeek.length}
          tone="good"
          active={tab === "done"}
          onClick={() => setTab("done")}
        />
      </div>

      <div className="mt-6">
        <NewTask />
      </div>

      <TasksView rows={rows} tab={tab} onTabChange={setTab} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: "default" | "warn" | "accent" | "good";
  active?: boolean;
  onClick?: () => void;
}) {
  const colorClass =
    tone === "warn"
      ? "text-[#ef8b8b]"
      : tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
      ? "text-emerald-300"
      : "text-[var(--text)]";
  const accentColor =
    tone === "warn"
      ? "#ef8b8b"
      : tone === "accent"
      ? "var(--accent)"
      : tone === "good"
      ? "#6dc8a1"
      : "var(--text-muted)";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`life-card p-3.5 text-left transition relative overflow-hidden ${
        active
          ? "border-[var(--border-strong)] bg-[var(--bg-card-hover)]"
          : "hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-strong)]"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
        />
      )}
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </button>
  );
}
