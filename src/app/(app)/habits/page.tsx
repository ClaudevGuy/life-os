import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery } from "@/lib/viewer";
import { demoForKind } from "@/lib/demo-data";
import { Flame } from "lucide-react";
import { HabitCard } from "./habit-card";
import { NewHabit } from "./new-habit";

export const metadata = { title: "Habits · Life OS" };
export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.kind, "habit")))
        .orderBy(desc(items.capturedAt))
        .limit(100),
    [],
  );
  if (rows.length === 0) rows = demoForKind("habit");

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Flame size={18} className="text-[var(--accent)]" />
            Habits
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Small daily moves. Streaks visible. Missed days forgiven.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-faint)]">
            {rows.length} tracked
          </span>
          <NewHabit />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 life-stagger">
        {rows.map((h) => (
          <HabitCard key={h.id} habit={h} />
        ))}
      </div>
    </div>
  );
}
