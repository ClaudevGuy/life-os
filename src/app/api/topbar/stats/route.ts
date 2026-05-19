import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getViewerId, demoUniverse, safeQuery } from "@/lib/viewer";

/**
 * Aggregates used in the top bar. Lightweight, no joins.
 */
export async function GET() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () => db.select().from(items).where(eq(items.userId, userId)),
    [],
  );
  if (rows.length === 0) rows = demoUniverse(userId);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const today = startOfToday.toISOString().slice(0, 10);

  let openTasks = 0;
  let overdueTasks = 0;
  let dueToday = 0;
  let toRead = 0;
  let pendingDecisions = 0;
  let habitsDone = 0;
  let habitsTotal = 0;
  let inboxCount = 0;
  let bestStreak = 0;

  for (const r of rows) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;

    if (r.status === "inbox") inboxCount++;

    if (r.kind === "task") {
      const completed = meta.completedAt as string | null | undefined;
      if (!completed && r.status !== "archived") {
        openTasks++;
        const due = meta.dueDate as string | undefined;
        if (due) {
          const d = new Date(due);
          if (d < startOfToday) overdueTasks++;
          else if (d >= startOfToday && d < endOfToday) dueToday++;
        }
      }
    }

    if (r.kind === "bookmark") {
      const state = meta.readState as string | undefined;
      if (!state || state === "to-read") toRead++;
    }

    if (r.kind === "decision") {
      const outcome = (meta.outcome as string | undefined) ?? "pending";
      const reviewAt = meta.reviewAt as string | undefined;
      if (outcome === "pending" && reviewAt && new Date(reviewAt) <= new Date()) {
        pendingDecisions++;
      }
    }

    if (r.kind === "habit") {
      habitsTotal++;
      const checkins = (meta.checkins as string[] | undefined) ?? [];
      if (checkins.includes(today)) habitsDone++;
      // streak: walk back from today
      let streak = 0;
      const set = new Set(checkins);
      for (let i = 0; i < 365; i++) {
        const d = new Date(Date.now() - i * 86_400_000)
          .toISOString()
          .slice(0, 10);
        if (set.has(d)) streak++;
        else if (i === 0) continue;
        else break;
      }
      if (streak > bestStreak) bestStreak = streak;
    }
  }

  return Response.json({
    openTasks,
    overdueTasks,
    dueToday,
    toRead,
    pendingDecisions,
    habitsDone,
    habitsTotal,
    inboxCount,
    bestStreak,
  });
}
