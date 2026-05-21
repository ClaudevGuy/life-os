"use client";

import { useEffect, useState } from "react";
import { greetingFor, TOD_CLASS, timeOfDay } from "@/lib/time-of-day";

export function TodayHero({
  openTaskCount,
  habitsDoneToday,
  habitTotal,
  streak,
  quote,
  weekCounts,
}: {
  openTaskCount: number;
  habitsDoneToday: number;
  habitTotal: number;
  streak: number;
  quote?: string | null;
  /** captures per day for last 7 days, oldest → newest */
  weekCounts?: number[];
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) {
    return <div className="h-44 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)]" />;
  }

  const tod = timeOfDay(now);
  const greeting = greetingFor(tod);
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  // Day-of-year + day progress
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000,
  ) + 1;
  const daysInYear =
    (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) ||
    now.getFullYear() % 400 === 0
      ? 366
      : 365;
  const yearPct = (dayOfYear / daysInYear) * 100;

  // ISO week number
  const weekNum = isoWeekNumber(now);

  // Day-progress: % through current 24h
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dayProgress = ((now.getTime() - startOfDay.getTime()) / 86_400_000) * 100;

  const week = weekCounts ?? [];
  const weekTotal = week.reduce((s, n) => s + n, 0);
  const weekMax = Math.max(...week, 1);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--border-soft)] ${TOD_CLASS[tod]}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/10" />
      <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
      <div className="relative p-7 sm:p-9 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6">
        {/* Left: greeting + stats */}
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/70">
            {dateLabel} · {timeLabel}
          </div>
          <h1
            className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight"
            style={{
              // The hero gradient is dark in every theme (it's a "sky"), so
              // the greeting needs to be bright regardless of light/dark mode.
              background:
                "linear-gradient(135deg, #FBF7EE 0%, #FAE2D6 55%, #E4B871 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {greeting}
          </h1>
          {quote && (
            <p className="mt-3 max-w-xl text-sm text-white/80 italic">
              “{quote}”
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 max-w-md gap-3">
            <HeroStat
              label="Open tasks"
              value={openTaskCount}
              tone={openTaskCount > 5 ? "warn" : "ok"}
            />
            <HeroStat
              label="Habits"
              value={`${habitsDoneToday}/${habitTotal}`}
              tone={habitsDoneToday === habitTotal && habitTotal > 0 ? "good" : "ok"}
            />
            <HeroStat
              label="Streak"
              value={streak > 0 ? `${streak}🔥` : "0"}
              tone={streak > 2 ? "good" : "ok"}
            />
          </div>
        </div>

        {/* Right: momentum sparkline + day/week context */}
        <div className="min-w-0 flex flex-col gap-3 self-stretch">
          <div className="rounded-xl bg-black/35 backdrop-blur border border-white/10 p-4 flex-1 min-h-[112px]">
            <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.14em] text-white/65">
              <span>7-day momentum</span>
              <span className="text-white tabular-nums normal-case tracking-normal text-base font-semibold">
                {weekTotal}
              </span>
            </div>
            <div className="mt-3 flex items-end gap-1.5 h-12">
              {week.length === 0
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-white/10"
                      style={{ height: "30%" }}
                    />
                  ))
                : week.map((n, i) => {
                    const isToday = i === week.length - 1;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition ${
                          isToday ? "bg-white" : "bg-white/40"
                        }`}
                        style={{
                          height: `${Math.max(8, (n / weekMax) * 100)}%`,
                          opacity: n === 0 ? 0.25 : 1,
                        }}
                        title={`${n} item${n === 1 ? "" : "s"}`}
                      />
                    );
                  })}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/50 uppercase tracking-wide font-mono">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>

          <div className="rounded-xl bg-black/35 backdrop-blur border border-white/10 p-3.5">
            <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.14em] text-white/65">
              <span>Week {weekNum}</span>
              <span className="tabular-nums">
                Day {dayOfYear}
                <span className="text-white/40"> / {daysInYear}</span>
              </span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/70 transition-all duration-1000"
                style={{ width: `${yearPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-white/55 font-mono tabular-nums">
              <span>{Math.floor(dayProgress)}% through today</span>
              <span>{Math.floor(yearPct)}% through year</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "ok" | "good" | "warn";
}) {
  const c =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-amber-200"
      : "text-white";
  return (
    <div className="rounded-xl bg-black/35 backdrop-blur border border-white/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/65">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${c}`}>
        {value}
      </div>
    </div>
  );
}

function isoWeekNumber(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
