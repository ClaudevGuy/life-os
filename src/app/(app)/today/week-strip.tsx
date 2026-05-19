"use client";

import { useEffect, useState } from "react";

export function WeekStrip() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!today) return <div className="h-16 rounded-xl bg-[var(--bg-card)] border border-[var(--border-soft)]" />;

  const start = new Date(today);
  start.setDate(today.getDate() - 3);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isToday =
            d.toDateString() === today.toDateString();
          const isPast = d < today && !isToday;
          return (
            <div
              key={d.toISOString()}
              className={`rounded-lg px-2 py-2 text-center transition ${
                isToday
                  ? "bg-[var(--accent-soft)] border border-[var(--accent)]"
                  : "border border-transparent hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div
                className={`text-sm mt-0.5 tabular-nums ${
                  isToday
                    ? "text-[var(--accent)] font-semibold"
                    : isPast
                    ? "text-[var(--text-faint)]"
                    : "text-[var(--text)]"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
