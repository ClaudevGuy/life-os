"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { ymd } from "@/lib/ymd";

export function WeekStrip() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  // Per-day activity: captures (capturedAt) + whether anything is due/scheduled.
  const data = useLiveQuery(async () => {
    const all = await db.items.toArray();
    const caps = new Map<string, number>();
    const events = new Set<string>();
    for (const r of all) {
      const cd = ymd(new Date(r.capturedAt));
      caps.set(cd, (caps.get(cd) ?? 0) + 1);
      const meta = (r.metadata ?? {}) as { dueDate?: string };
      if (r.kind === "task" && meta.dueDate) events.add(meta.dueDate.slice(0, 10));
    }
    return { caps, events };
  });

  if (!today) {
    return (
      <div className="h-[88px] rounded-xl bg-[var(--bg-card)] border border-[var(--border-soft)]" />
    );
  }

  const start = new Date(today);
  start.setDate(today.getDate() - 3);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const caps = data?.caps ?? new Map<string, number>();
  const events = data?.events ?? new Set<string>();
  const max = Math.max(1, ...days.map((d) => caps.get(ymd(d)) ?? 0));
  const todayKey = ymd(today);

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-2.5">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = ymd(d);
          const isToday = key === todayKey;
          const isPast = d < today && !isToday;
          const count = caps.get(key) ?? 0;
          const hasEvent = events.has(key);
          const barH = count > 0 ? Math.max(26, (count / max) * 100) : 0;
          const barColor = isToday
            ? "var(--accent)"
            : isPast
              ? "color-mix(in oklch, var(--accent) 55%, transparent)"
              : "color-mix(in oklch, var(--accent) 32%, transparent)";

          return (
            <Link
              key={d.toISOString()}
              href="/calendar"
              title={`${count} capture${count === 1 ? "" : "s"}${
                hasEvent ? " · scheduled" : ""
              }`}
              className={`group relative flex flex-col items-center rounded-[10px] px-1 pt-2 pb-1.5 transition ${
                isToday
                  ? "border"
                  : "border border-transparent hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-soft)]"
              }`}
              style={
                isToday
                  ? {
                      background:
                        "color-mix(in oklch, var(--accent) 12%, var(--bg-card))",
                      borderColor:
                        "color-mix(in oklch, var(--accent) 35%, transparent)",
                    }
                  : undefined
              }
            >
              {hasEvent && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              )}
              <div
                className="text-[10px] uppercase tracking-[0.1em] font-semibold"
                style={{
                  color: isToday ? "var(--accent)" : "var(--text-faint)",
                }}
              >
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div
                className={`text-[18px] leading-none mt-1 tabular-nums ${
                  isToday
                    ? "font-bold"
                    : isPast
                      ? "font-medium"
                      : "font-medium"
                }`}
                style={{
                  color: isToday
                    ? "var(--accent)"
                    : isPast
                      ? "var(--text-muted)"
                      : "var(--text)",
                }}
              >
                {d.getDate()}
              </div>

              {/* Activity bar */}
              <div className="mt-2 h-[26px] w-full flex items-end justify-center">
                {count > 0 ? (
                  <div
                    className="w-[60%] max-w-[26px] rounded-[3px] transition-all"
                    style={{ height: `${barH}%`, background: barColor }}
                  />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full mb-1"
                    style={{ background: "var(--border-soft)" }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
