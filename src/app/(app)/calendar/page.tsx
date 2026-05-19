import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { CalendarDays } from "lucide-react";
import { CalendarView } from "./calendar-view";

export const metadata = { title: "Calendar · Life OS" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () => db.select().from(items).where(eq(items.userId, userId)),
    [],
  );
  if (rows.length === 0) rows = demoUniverse(userId);

  // Build calendar items. Each row contributes up to 3 entries depending on
  // its kind and metadata (captured date, due date, review date).
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
      reviewAt?: string;
      completedAt?: string | null;
    };
    if (r.kind === "task" && meta.dueDate) {
      calItems.push({
        id: r.id,
        kind: r.kind,
        title: r.title,
        summary: r.summary,
        isoDate: meta.dueDate.slice(0, 10),
        via: "due",
      });
      continue;
    }
    if (r.kind === "decision" && meta.reviewAt) {
      calItems.push({
        id: r.id,
        kind: r.kind,
        title: r.title,
        summary: r.summary,
        isoDate: meta.reviewAt.slice(0, 10),
        via: "review",
      });
      // also show the capture day, so you see "I decided this" historically
    }
    // Default placement: capturedAt
    calItems.push({
      id: r.id,
      kind: r.kind,
      title: r.title,
      summary: r.summary,
      isoDate: new Date(r.capturedAt).toISOString().slice(0, 10),
      via: "captured",
    });
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
            Tasks land on their due date, decisions on their review date, everything else on the day you saved it.
          </p>
        </div>
      </div>
      <CalendarView items={calItems} />
    </div>
  );
}
