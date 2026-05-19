import { getViewerId } from "@/lib/viewer";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  findDemoItem,
  updateDemoItem,
  listDemoItems,
} from "@/lib/demo-store";
import { addDemoItem } from "@/lib/demo-store";
import { DEMO_ITEMS } from "@/lib/demo-data";

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

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getViewerId();
  const { id } = await ctx.params;

  try {
    const [row] = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.id, id)))
      .limit(1);
    if (!row) throw new Error("not_in_db");

    const meta = (row.metadata ?? {}) as {
      completedAt?: string | null;
      recurrence?: string | null;
    };
    const nextCompleted = meta.completedAt ? null : new Date().toISOString();

    await db
      .update(items)
      .set({
        metadata: { ...meta, completedAt: nextCompleted },
        status: nextCompleted ? "archived" : "active",
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.userId, userId)));

    if (nextCompleted && meta.recurrence) {
      // schedule next occurrence (best-effort in demo store; phase 2: server cron)
      addDemoItem(userId, {
        kind: "task",
        title: row.title,
        metadata: {
          ...meta,
          completedAt: null,
          dueDate: nextOccurrence(meta.recurrence, new Date()).toISOString(),
        },
      });
    }

    return Response.json({ ok: true, completedAt: nextCompleted });
  } catch {
    // demo path
    const seeded = DEMO_ITEMS.find((d) => d.id === id);
    const stored = findDemoItem(userId, id);
    const current = stored ?? seeded ?? null;
    if (!current) return Response.json({ ok: true, demo: true });

    const meta = (current.metadata ?? {}) as {
      completedAt?: string | null;
      recurrence?: string | null;
    };
    const nextCompleted = meta.completedAt ? null : new Date().toISOString();

    if (stored) {
      updateDemoItem(userId, id, {
        metadata: { ...meta, completedAt: nextCompleted },
        status: nextCompleted ? "archived" : "active",
      });
    } else {
      // copy seeded → demo store so we can mutate
      addDemoItem(userId, {
        ...current,
        id: current.id,
        metadata: { ...meta, completedAt: nextCompleted },
        status: nextCompleted ? "archived" : "active",
      });
    }

    if (nextCompleted && meta.recurrence) {
      addDemoItem(userId, {
        kind: "task",
        title: current.title,
        metadata: {
          ...meta,
          completedAt: null,
          dueDate: nextOccurrence(meta.recurrence, new Date()).toISOString(),
        },
      });
    }

    return Response.json({ ok: true, demo: true, completedAt: nextCompleted });
  }
}
