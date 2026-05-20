"use client";

import { useAllItems } from "@/lib/store/items";
import { CalendarDays } from "lucide-react";
import { CalendarView } from "./calendar-view";

export default function CalendarPage() {
  const rows = useAllItems() ?? [];

  const calItems: Array<{
    id: string;
    kind: string;
    title: string | null;
    summary: string | null;
    isoDate: string;
    via: "captured" | "due" | "review";
  }> = [];

  for (const r of rows) {
    const meta = (r.metadata ?? {}) as {
      dueDate?: string;
      reminder?: boolean;
    };
    // Only reminders surface on the calendar. Everything else (notes, tasks,
    // decisions, captures) lives on its own page — the calendar is a pure
    // reminder/time-block view.
    if (r.kind === "task" && meta.reminder === true && meta.dueDate) {
      calItems.push({
        id: r.id,
        kind: r.kind,
        title: r.title,
        summary: r.summary,
        isoDate: meta.dueDate.slice(0, 10),
        via: "due",
      });
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <CalendarDays size={18} className="text-[var(--accent)]" />
            Calendar
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Reminders, one screen. Add them inline — kept out of your task list.
          </p>
        </div>
      </div>
      <CalendarView items={calItems} />
    </div>
  );
}
