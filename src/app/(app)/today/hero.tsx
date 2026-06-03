"use client";

import { useEffect, useState } from "react";
import { ListTodo, Flame, ArrowRight, Moon } from "lucide-react";
import {
  greetingFor,
  TOD_CLASS,
  timeOfDay,
  type TimeOfDay,
} from "@/lib/time-of-day";

type NextUp = { title: string; whenLabel: string };

export function TodayHero({
  openTaskCount,
  habitsDoneToday,
  habitTotal,
  streak,
  dueToday = 0,
  nextUp = null,
  weekCounts,
}: {
  openTaskCount: number;
  habitsDoneToday: number;
  habitTotal: number;
  streak: number;
  dueToday?: number;
  nextUp?: NextUp | null;
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
    return (
      <div className="h-48 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)]" />
    );
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

  // Day-of-year + year progress
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000) + 1;
  const daysInYear =
    (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) ||
    now.getFullYear() % 400 === 0
      ? 366
      : 365;
  const yearPct = (dayOfYear / daysInYear) * 100;
  const weekNum = isoWeekNumber(now);

  // % through the current 24h
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const dayProgress =
    ((now.getTime() - startOfDay.getTime()) / 86_400_000) * 100;

  // The real 7-day window ending today (fixes the old hard-coded Mon–Sun row).
  const week = weekCounts ?? [];
  const weekTotal = week.reduce((s, n) => s + n, 0);
  const weekMax = Math.max(...week, 1);
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    return d;
  });

  const habitsLeft = Math.max(0, habitTotal - habitsDoneToday);
  const habitsAllDone = habitTotal > 0 && habitsLeft === 0;
  const line = heroLine(tod, {
    open: openTaskCount,
    due: dueToday,
    habitsLeft,
    habitTotal,
  });

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 ${TOD_CLASS[tod]}`}
    >
      {/* Atmosphere */}
      <SkyDecor tod={tod} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-transparent" />

      <div className="relative p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8">
        {/* ── Left: greeting, context, stats ── */}
        <div className="min-w-0 flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/60">
            {dateLabel} · {timeLabel}
          </div>
          <h1
            className="mt-1.5 text-3xl sm:text-[2.5rem] leading-[1.05] font-semibold tracking-tight"
            style={{
              background:
                "linear-gradient(135deg, #FBF7EE 0%, #FAE2D6 55%, #E4B871 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {greeting}
          </h1>
          <p className="mt-2 text-[14px] text-white/75 max-w-md leading-snug">
            {line}
          </p>

          {/* Next up */}
          <div className="mt-4">
            {nextUp ? (
              <div className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] backdrop-blur pl-3 pr-3.5 py-1.5 max-w-full">
                <span className="text-[9.5px] uppercase tracking-[0.16em] text-white/55 shrink-0">
                  Next
                </span>
                <span className="w-px h-3 bg-white/15 shrink-0" />
                <span className="text-[13px] text-white font-medium truncate">
                  {nextUp.title}
                </span>
                <span className="text-[12px] text-[#F0C998] tabular-nums shrink-0">
                  {nextUp.whenLabel}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-[12.5px] text-white/55">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                Nothing scheduled — the day is yours.
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-auto pt-6 grid grid-cols-3 gap-2.5 max-w-lg">
            <StatChip
              icon={<ListTodo size={13} strokeWidth={1.8} />}
              label="Tasks"
              value={openTaskCount}
              hint={
                dueToday > 0
                  ? `${dueToday} due today`
                  : openTaskCount === 0
                    ? "all clear"
                    : "none due today"
              }
              accent={dueToday > 0}
            />
            <StatChip
              icon={
                <HabitRing done={habitsDoneToday} total={habitTotal} />
              }
              label="Habits"
              value={`${habitsDoneToday}/${habitTotal}`}
              hint={
                habitTotal === 0
                  ? "none yet"
                  : habitsAllDone
                    ? "all done"
                    : `${habitsLeft} left`
              }
              accent={habitsAllDone}
            />
            <StatChip
              icon={
                <Flame
                  size={13}
                  strokeWidth={1.8}
                  className={streak > 0 ? "text-[#F0A878]" : ""}
                  fill={streak > 0 ? "#F0A878" : "none"}
                />
              }
              label="Streak"
              value={streak}
              hint={streak > 0 ? "days going" : "start today"}
              accent={streak > 2}
            />
          </div>
        </div>

        {/* ── Right: momentum + time progress ── */}
        <div className="min-w-0 flex flex-col gap-3">
          {/* Momentum */}
          <div className="rounded-xl bg-white/[0.06] backdrop-blur border border-white/[0.12] p-4 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/60">
                7-day momentum
              </span>
              <span className="text-white tabular-nums text-[15px] font-semibold">
                {weekTotal}
                <span className="text-white/45 text-[11px] font-normal">
                  {" "}
                  captured
                </span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1.5 items-end h-14">
              {days7.map((d, i) => {
                const n = week[i] ?? 0;
                const isToday = i === 6;
                return (
                  <div
                    key={i}
                    className="rounded-md w-full transition-all"
                    style={{
                      height: `${Math.max(7, (n / weekMax) * 100)}%`,
                      background: isToday
                        ? "linear-gradient(to top, #E4B871, #FAE2D6)"
                        : "rgba(255,255,255,0.32)",
                      opacity: n === 0 && !isToday ? 0.35 : 1,
                    }}
                    title={`${d.toLocaleDateString(undefined, {
                      weekday: "long",
                    })} · ${n} item${n === 1 ? "" : "s"}`}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5 text-[9px] uppercase tracking-wide font-mono">
              {days7.map((d, i) => {
                const isToday = i === 6;
                return (
                  <span
                    key={i}
                    className={`text-center ${
                      isToday ? "text-[#F0C998] font-semibold" : "text-white/45"
                    }`}
                  >
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Time progress */}
          <div className="rounded-xl bg-white/[0.06] backdrop-blur border border-white/[0.12] p-4">
            <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.14em] text-white/60">
              <span>Week {weekNum}</span>
              <span className="tabular-nums">
                Day {dayOfYear}
                <span className="text-white/40"> / {daysInYear}</span>
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              <MiniProgress
                label="Through today"
                pct={dayProgress}
                color="rgba(255,255,255,0.85)"
              />
              <MiniProgress
                label="Through year"
                pct={yearPct}
                color="#E4B871"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.06] backdrop-blur border border-white/[0.12] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/55">
        <span className="text-white/70">{icon}</span>
        <span className="text-[9.5px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div
        className={`mt-1.5 text-[22px] leading-none font-semibold tabular-nums ${
          accent ? "text-[#F5D9AE]" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] text-white/50 truncate">{hint}</div>
    </div>
  );
}

function HabitRing({ done, total }: { done: number; total: number }) {
  const size = 13;
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#7FD0A6"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

function MiniProgress({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="flex items-center justify-between text-[10.5px] mb-1">
        <span className="text-white/60">{label}</span>
        <span className="tabular-nums text-white/80 font-mono">
          {Math.floor(clamped)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  );
}

// A soft sun/moon glow + stars at night, behind the content.
function SkyDecor({ tod }: { tod: TimeOfDay }) {
  const orb: Record<TimeOfDay, { glow: string; core: string; size: number }> = {
    dawn: { glow: "rgba(242,192,168,0.55)", core: "#F4CBB2", size: 96 },
    morning: { glow: "rgba(233,210,164,0.5)", core: "#F2DCAE", size: 104 },
    day: { glow: "rgba(251,239,208,0.55)", core: "#FBEFD0", size: 120 },
    evening: { glow: "rgba(231,119,93,0.5)", core: "#EE9A7E", size: 104 },
    night: { glow: "rgba(200,214,235,0.4)", core: "#D6E0F0", size: 84 },
  };
  const o = orb[tod];
  const stars = tod === "night" || tod === "dawn";

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* glow halo */}
      <div
        className="absolute rounded-full"
        style={{
          top: -70,
          right: 90,
          width: 260,
          height: 260,
          background: `radial-gradient(circle, ${o.glow} 0%, transparent 68%)`,
          filter: "blur(6px)",
        }}
      />
      {/* core disc */}
      <div
        className="absolute rounded-full"
        style={{
          top: 26,
          right: 150,
          width: o.size,
          height: o.size,
          background: `radial-gradient(circle at 38% 34%, ${o.core} 0%, ${o.core} 55%, transparent 72%)`,
          boxShadow: `0 0 50px ${o.glow}`,
          opacity: tod === "night" ? 0.85 : 0.65,
        }}
      />
      {/* soft corner wash */}
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
      {/* stars */}
      {stars &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              opacity: s.o,
              animationDelay: s.d,
              animationDuration: "3.5s",
            }}
          />
        ))}
    </div>
  );
}

const STARS = [
  { top: "14%", left: "52%", size: 2, o: 0.8, d: "0s" },
  { top: "22%", left: "70%", size: 1.5, o: 0.6, d: "0.6s" },
  { top: "31%", left: "61%", size: 2, o: 0.5, d: "1.2s" },
  { top: "17%", left: "83%", size: 1.5, o: 0.7, d: "0.3s" },
  { top: "42%", left: "76%", size: 1, o: 0.5, d: "0.9s" },
  { top: "26%", left: "46%", size: 1, o: 0.45, d: "1.5s" },
  { top: "11%", left: "66%", size: 1.5, o: 0.65, d: "0.4s" },
  { top: "47%", left: "88%", size: 1.5, o: 0.5, d: "1.1s" },
] as const;

function heroLine(
  tod: TimeOfDay,
  o: { open: number; due: number; habitsLeft: number; habitTotal: number },
): string {
  if (tod === "night") {
    return o.open > 0 || o.habitsLeft > 0
      ? "A late one — leave the rest for tomorrow-you."
      : "A late one — rest easy, you're on top of it.";
  }
  if (o.due > 0) return `${o.due} thing${o.due > 1 ? "s" : ""} due today.`;
  if (o.habitsLeft > 0)
    return `${o.habitsLeft} habit${o.habitsLeft > 1 ? "s" : ""} still to check off.`;
  if (o.open > 0)
    return `${o.open} open task${o.open > 1 ? "s" : ""} whenever you're ready.`;
  if (o.habitTotal > 0) return "All done for today. Beautifully clear.";
  return tod === "morning"
    ? "A clean slate. What matters most today?"
    : "Nothing pressing — enjoy the space.";
}

function isoWeekNumber(d: Date): number {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
