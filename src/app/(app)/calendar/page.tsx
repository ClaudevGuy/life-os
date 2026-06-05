"use client";

import { useMemo } from "react";
import { useAllItems } from "@/lib/store/items";
import { readSubscription, formatMoney } from "@/lib/subscriptions";
import { CalendarDays } from "lucide-react";
import { CalendarView, type CalItem } from "./calendar-view";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function timeOf(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return null; // midnight → treat as all-day
  return `${pad(h)}:${pad(m)}`;
}

function parseMonthDay(
  s: string,
): { month: number; day: number; year?: number } | null {
  const m = /(?:(\d{4})[-/])?(\d{1,2})[-/](\d{1,2})/.exec(s);
  if (!m) return null;
  const year = m[1] ? Number(m[1]) : undefined;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day, year };
}

export default function CalendarPage() {
  const rows = useAllItems() ?? [];

  const calItems = useMemo(() => {
    const out: CalItem[] = [];
    const nowYear = new Date().getFullYear();

    for (const r of rows) {
      const meta = (r.metadata ?? {}) as {
        dueDate?: string;
        reminder?: boolean;
        completedAt?: string | null;
        targetDate?: string;
        birthday?: string;
      };
      const archived = r.status === "archived";

      // Tasks & reminders with a due date.
      if (r.kind === "task" && meta.dueDate) {
        const completed = Boolean(meta.completedAt);
        out.push({
          id: r.id,
          kind: r.kind,
          title: r.title,
          summary: r.summary,
          isoDate: meta.dueDate.slice(0, 10),
          time: timeOf(meta.dueDate),
          type: meta.reminder ? "reminder" : "task",
          status: completed || archived ? "archived" : r.status,
          href: `/items/${r.id}`,
          meta: null,
        });
      }

      // Subscription renewals.
      if (r.kind === "subscription" && !archived) {
        const sub = readSubscription(r);
        if (sub?.nextChargeAt) {
          out.push({
            id: r.id,
            kind: r.kind,
            title: r.title,
            summary: r.summary,
            isoDate: sub.nextChargeAt.slice(0, 10),
            time: null,
            type: "subscription",
            status: r.status,
            href: "/subscriptions",
            meta: formatMoney(sub.amount, sub.currency),
          });
        }
      }

      // Project deadlines.
      if (r.kind === "project" && meta.targetDate && !archived) {
        out.push({
          id: r.id,
          kind: r.kind,
          title: r.title,
          summary: r.summary,
          isoDate: meta.targetDate.slice(0, 10),
          time: null,
          type: "deadline",
          status: r.status,
          href: `/items/${r.id}`,
          meta: null,
        });
      }

      // Birthdays — recurring, materialized across a few years for navigation.
      if (r.kind === "person" && meta.birthday && !archived) {
        const md = parseMonthDay(meta.birthday);
        if (md) {
          for (let y = nowYear - 1; y <= nowYear + 2; y++) {
            out.push({
              id: r.id,
              kind: r.kind,
              title: `${r.title?.trim() || "Someone"}’s birthday`,
              summary: null,
              isoDate: `${y}-${pad(md.month)}-${pad(md.day)}`,
              time: null,
              type: "birthday",
              status: r.status,
              href: `/items/${r.id}`,
              meta: md.year ? `turns ${y - md.year}` : null,
            });
          }
        }
      }
    }
    return out;
  }, [rows]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <CalendarDays size={18} className="text-[var(--accent)]" />
            Calendar
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Everything with a date — reminders, due tasks, renewals, birthdays
            and deadlines. Click a day to add a reminder or check items off.
          </p>
        </div>
      </div>
      <CalendarView items={calItems} />
    </div>
  );
}
