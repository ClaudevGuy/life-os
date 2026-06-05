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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto pg-enter">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3.5">
          <div
            className="grid place-items-center w-12 h-12 rounded-[15px] shrink-0"
            style={{
              background: "color-mix(in oklch, var(--terra) 15%, var(--paper))",
              border: "1px solid color-mix(in oklch, var(--terra) 32%, transparent)",
            }}
          >
            <ListTodo size={22} strokeWidth={1.7} className="text-[var(--terra)]" />
          </div>
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-none">
              Tasks
            </h1>
            <p className="text-[13.5px] text-[var(--muted)] mt-2 leading-none">
              What needs doing — with stakes, dates, context, and subtasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatChip label="Open" value={open.length} tone="ink" />
          <StatChip label="Overdue" value={overdue.length} tone="terra" />
          <StatChip label="Due today" value={dueToday.length} tone="gold" />
          <StatChip label="Done · 7d" value={doneThisWeek.length} tone="sage" />
        </div>
      </header>

      <NewTask />

      <TasksView rows={rows} tab={tab} onTabChange={setTab} />
    </div>
  );
}

function StatChip({
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
    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--paper-2)] border border-[var(--line)] pl-3 pr-3.5 py-1.5">
      <span
        className="text-[16px] font-semibold tabular-nums leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--muted)] leading-none">
        {label}
      </span>
    </div>
  );
}
