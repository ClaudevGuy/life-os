import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { ListTodo } from "lucide-react";
import { NewTask } from "./new-task";
import { TasksView } from "./tasks-view";

export const metadata = { title: "Tasks · Life OS" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.kind, "task")))
        .orderBy(desc(items.capturedAt))
        .limit(500),
    [],
  );
  if (rows.length === 0) rows = demoUniverse(userId).filter((i) => i.kind === "task");

  // Stats
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
        <Stat label="Open" value={open.length} tone="default" />
        <Stat label="Overdue" value={overdue.length} tone="warn" />
        <Stat label="Due today" value={dueToday.length} tone="accent" />
        <Stat label="Done this week" value={doneThisWeek.length} tone="good" />
      </div>

      <div className="mt-6">
        <NewTask />
      </div>

      <TasksView rows={rows} />
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
  tone: "default" | "warn" | "accent" | "good";
}) {
  const colorClass =
    tone === "warn"
      ? "text-[#ef8b8b]"
      : tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
      ? "text-emerald-300"
      : "text-[var(--text)]";
  return (
    <div className="life-card p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}
