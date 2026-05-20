"use client";

import { useState } from "react";
import { useItemsOfKind } from "@/lib/store/items";
import { ListTodo } from "lucide-react";
import { NewTask } from "./new-task";
import { TasksView, type Tab } from "./tasks-view";

export default function TasksPage() {
  const rows = useItemsOfKind("task") ?? [];
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
    <div className="p-8 max-w-7xl mx-auto pg-enter">
      <header className="mb-6">
        <h1 className="life-h1 inline-flex items-center gap-2">
          <ListTodo size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
          Tasks
        </h1>
        <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
          What needs doing — with stakes, dates, and a clear definition of done.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger">
        <Stat label="Open" value={open.length} tone="ink" />
        <Stat label="Overdue" value={overdue.length} tone="terra" />
        <Stat label="Due today" value={dueToday.length} tone="gold" />
        <Stat label="Done this week" value={doneThisWeek.length} tone="sage" />
      </div>

      <div className="mt-4">
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
}: {
  label: string;
  value: number;
  tone: "ink" | "terra" | "gold" | "sage";
}) {
  const color =
    tone === "terra"
      ? "var(--terra)"
      : tone === "gold"
      ? "var(--gold)"
      : tone === "sage"
      ? "var(--sage)"
      : "var(--ink)";
  return (
    <div className="life-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-[34px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}
