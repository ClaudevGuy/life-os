"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HeartPulse,
  Moon,
  Scale,
  Dumbbell,
  Droplet,
  Zap,
  Flame,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  useHealthLog,
  useHealthLogs,
  saveHealthLog,
  kgToUnit,
  unitToKg,
  scoreColor,
  averageOf,
  loggedStreak,
  MOOD_EMOJI,
  MOOD_LABEL,
  ENERGY_LABEL,
  type WeightUnit,
  type StoredHealthLog,
  type HealthMetricKey,
} from "@/lib/store/health";
import { ymd } from "@/lib/ymd";

const UNIT_KEY = "lifeos.health.weightUnit";
const ACTIVITY_CHIPS = [0, 15, 30, 45, 60, 90];
const TREND_DAYS = 14;

export default function HealthPage() {
  const today = ymd(new Date());
  const log = useHealthLog(today);
  const logs = useHealthLogs(30) ?? [];

  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    try {
      const u = localStorage.getItem(UNIT_KEY);
      if (u === "lb" || u === "kg") setUnit(u);
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);
  function changeUnit(u: WeightUnit) {
    setUnit(u);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {
      /* ignore */
    }
  }

  function set(patch: Partial<Omit<StoredHealthLog, "date" | "updatedAt">>) {
    saveHealthLog(today, patch);
  }

  // Build last-N-day series.
  const dates = useMemo(
    () =>
      Array.from({ length: TREND_DAYS }, (_, i) =>
        ymd(new Date(Date.now() - (TREND_DAYS - 1 - i) * 86_400_000)),
      ),
    [],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, StoredHealthLog>();
    for (const l of logs) m.set(l.date, l);
    return m;
  }, [logs]);
  const series = (key: HealthMetricKey): (number | null)[] =>
    dates.map((d) => {
      const v = byDate.get(d)?.[key];
      return typeof v === "number" ? v : null;
    });

  const streak = loggedStreak(logs);
  const last7 = logs.filter(
    (l) => l.date >= ymd(new Date(Date.now() - 6 * 86_400_000)),
  );
  const avgSleep = averageOf(last7, "sleepHours");
  const avgMood = averageOf(last7, "mood");

  // Weight headline
  const weightSeries = series("weightKg");
  const weightVals = weightSeries.filter((v): v is number => v !== null);
  const currentWeight = weightVals.at(-1) ?? null;
  const firstWeight = weightVals[0] ?? null;
  const weightDelta =
    currentWeight != null && firstWeight != null
      ? currentWeight - firstWeight
      : null;

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto pg-enter space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <HeartPulse size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
            Health
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            A daily check-in for body and mind. Small notes, big patterns.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
          {(["kg", "lb"] as WeightUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => changeUnit(u)}
              className={`px-2.5 py-1 rounded-full text-[12px] font-medium uppercase tracking-wide transition ${
                unit === u
                  ? "bg-[var(--paper)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </header>

      {/* Today's check-in */}
      <section className="life-card p-6 relative overflow-hidden">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "var(--terra)" }}
        />
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
            How are you today?
          </h2>
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Mind */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Label icon={HeartPulse}>Mood</Label>
            <div className="flex items-center gap-2">
              {MOOD_EMOJI.map((e, i) => {
                const v = i + 1;
                const on = log?.mood === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set({ mood: on ? undefined : v })}
                    title={MOOD_LABEL[i]}
                    className={`grid place-items-center w-11 h-11 rounded-[12px] text-[20px] transition ${
                      on
                        ? "scale-110"
                        : "opacity-45 hover:opacity-90 hover:scale-105"
                    }`}
                    style={
                      on
                        ? {
                            background: `color-mix(in oklch, ${scoreColor(v)} 18%, transparent)`,
                            boxShadow: `inset 0 0 0 1.5px ${scoreColor(v)}`,
                          }
                        : undefined
                    }
                  >
                    {e}
                  </button>
                );
              })}
            </div>
            {log?.mood && (
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                {MOOD_LABEL[log.mood - 1]}
              </p>
            )}
          </div>

          <div>
            <Label icon={Zap}>Energy</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((v) => {
                const on = (log?.energy ?? 0) >= v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      set({ energy: log?.energy === v ? undefined : v })
                    }
                    aria-label={`Energy ${v}`}
                    className="grid place-items-center w-11 h-11 rounded-[12px] border transition hover:scale-105"
                    style={{
                      borderColor: on
                        ? scoreColor(log?.energy ?? v)
                        : "var(--line-2)",
                      background: on
                        ? `color-mix(in oklch, ${scoreColor(log?.energy ?? v)} 16%, transparent)`
                        : "transparent",
                    }}
                  >
                    <Zap
                      size={16}
                      style={{
                        color: on ? scoreColor(log?.energy ?? v) : "var(--muted-2)",
                      }}
                      fill={on ? scoreColor(log?.energy ?? v) : "none"}
                    />
                  </button>
                );
              })}
            </div>
            {log?.energy && (
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                {ENERGY_LABEL[log.energy - 1]}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 pt-6 border-t border-[var(--line)] grid grid-cols-2 sm:grid-cols-4 gap-5">
          <div>
            <Label icon={Moon}>Sleep</Label>
            <NumberStepper
              value={log?.sleepHours}
              step={0.5}
              min={0}
              max={16}
              suffix="h"
              onChange={(v) => set({ sleepHours: v })}
            />
          </div>
          <div>
            <Label icon={Scale}>Weight</Label>
            <WeightInput
              kg={log?.weightKg}
              unit={unit}
              mounted={mounted}
              onChange={(kg) => set({ weightKg: kg })}
            />
          </div>
          <div>
            <Label icon={Droplet}>Water</Label>
            <div className="flex items-center gap-1 flex-wrap">
              {Array.from({ length: 8 }).map((_, i) => {
                const filled = (log?.water ?? 0) > i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      set({ water: (log?.water ?? 0) === i + 1 ? i : i + 1 })
                    }
                    aria-label={`${i + 1} glasses`}
                  >
                    <Droplet
                      size={17}
                      className="transition"
                      style={{ color: filled ? "var(--sky)" : "var(--line-2)" }}
                      fill={filled ? "var(--sky)" : "none"}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label icon={Dumbbell}>Activity</Label>
            <div className="flex items-center gap-1 flex-wrap">
              {ACTIVITY_CHIPS.map((m) => {
                const on = (log?.activeMin ?? 0) === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set({ activeMin: m })}
                    className={`px-2 py-1 rounded-[8px] text-[11.5px] font-medium tabular-nums transition ${
                      on
                        ? "bg-[var(--terra)] text-white"
                        : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)]"
                    }`}
                  >
                    {m === 0 ? "0" : `${m}m`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6">
          <Label icon={HeartPulse}>Note</Label>
          <input
            defaultValue={log?.note ?? ""}
            key={log?.note ?? today}
            onBlur={(e) => set({ note: e.target.value.trim() || undefined })}
            placeholder="Anything worth remembering about today…"
            className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
          />
        </div>
      </section>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat
          icon={Flame}
          label="Check-in streak"
          value={streak > 0 ? `${streak}d` : "—"}
          tone="var(--terra)"
        />
        <SummaryStat
          icon={Moon}
          label="Avg sleep · 7d"
          value={avgSleep != null ? `${avgSleep.toFixed(1)}h` : "—"}
          tone="var(--sky)"
        />
        <SummaryStat
          icon={HeartPulse}
          label="Avg mood · 7d"
          value={avgMood != null ? avgMood.toFixed(1) : "—"}
          tone="var(--sage)"
        />
        <SummaryStat
          icon={Scale}
          label="Weight"
          value={
            currentWeight != null
              ? `${kgToUnit(currentWeight, unit).toFixed(1)}${unit}`
              : "—"
          }
          tone="var(--gold)"
        />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricCard
          icon={HeartPulse}
          title="Mood"
          color="var(--sage)"
          headline={avgMood != null ? `${avgMood.toFixed(1)} avg` : "No data"}
        >
          <ScoreTrack data={series("mood")} />
        </MetricCard>

        <MetricCard
          icon={Zap}
          title="Energy"
          color="var(--gold)"
          headline={
            averageOf(last7, "energy") != null
              ? `${averageOf(last7, "energy")!.toFixed(1)} avg`
              : "No data"
          }
        >
          <ScoreTrack data={series("energy")} />
        </MetricCard>

        <MetricCard
          icon={Moon}
          title="Sleep"
          color="var(--sky)"
          headline={avgSleep != null ? `${avgSleep.toFixed(1)}h avg` : "No data"}
        >
          <Bars data={series("sleepHours")} color="var(--sky)" target={8} unit="h" />
        </MetricCard>

        <MetricCard
          icon={Dumbbell}
          title="Activity"
          color="var(--terra)"
          headline={`${series("activeMin").reduce<number>((s, v) => s + (v ?? 0), 0)} min · ${TREND_DAYS}d`}
        >
          <Bars data={series("activeMin")} color="var(--terra)" unit="m" />
        </MetricCard>

        {weightVals.length > 0 && (
          <MetricCard
            icon={Scale}
            title="Weight"
            color="var(--gold)"
            headline={
              currentWeight != null
                ? `${kgToUnit(currentWeight, unit).toFixed(1)} ${unit}`
                : "No data"
            }
            trailing={
              weightDelta != null && Math.abs(weightDelta) >= 0.05 ? (
                <span
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium tabular-nums"
                  style={{ color: weightDelta <= 0 ? "var(--sage)" : "var(--gold)" }}
                >
                  {weightDelta <= 0 ? (
                    <TrendingDown size={12} />
                  ) : (
                    <TrendingUp size={12} />
                  )}
                  {weightDelta > 0 ? "+" : ""}
                  {kgToUnit(weightDelta, unit).toFixed(1)} {unit}
                </span>
              ) : undefined
            }
          >
            <Line data={weightSeries} unit={unit} />
          </MetricCard>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Inputs
// ──────────────────────────────────────────────────────────────────────

function Label({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2.5">
      <Icon size={12} />
      {children}
    </div>
  );
}

function NumberStepper({
  value,
  step,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number | undefined;
  step: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number | undefined) => void;
}) {
  const v = value ?? 0;
  function bump(dir: 1 | -1) {
    const next = Math.round((v + dir * step) * 10) / 10;
    if (next < min) return onChange(undefined);
    onChange(Math.min(max, next));
  }
  return (
    <div className="inline-flex items-center rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] overflow-hidden">
      <button
        type="button"
        onClick={() => bump(-1)}
        className="grid place-items-center w-8 h-9 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)] transition text-[18px] leading-none"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="min-w-[48px] text-center text-[15px] font-semibold tabular-nums text-[var(--ink)]">
        {value != null ? `${value}${suffix}` : "—"}
      </span>
      <button
        type="button"
        onClick={() => bump(1)}
        className="grid place-items-center w-8 h-9 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)] transition text-[18px] leading-none"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function WeightInput({
  kg,
  unit,
  mounted,
  onChange,
}: {
  kg: number | undefined;
  unit: WeightUnit;
  mounted: boolean;
  onChange: (kg: number | undefined) => void;
}) {
  const display = kg != null && mounted ? kgToUnit(kg, unit).toFixed(1) : "";
  return (
    <div className="inline-flex items-center rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-2.5 h-9 focus-within:border-[var(--terra)] transition">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        defaultValue={display}
        key={`${display}-${unit}`}
        onBlur={(e) => {
          const val = e.target.value.trim();
          if (!val) return onChange(undefined);
          const n = Number(val);
          if (Number.isFinite(n) && n > 0) onChange(unitToKg(n, unit));
        }}
        placeholder="—"
        className="w-12 bg-transparent text-[15px] font-semibold tabular-nums text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
      />
      <span className="text-[12px] text-[var(--muted)] uppercase">{unit}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Trend visuals
// ──────────────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  title,
  color,
  headline,
  trailing,
  children,
}: {
  icon: LucideIcon;
  title: string;
  color: string;
  headline: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="life-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px]"
            style={{
              background: `color-mix(in oklch, ${color} 15%, transparent)`,
              color,
            }}
          >
            <Icon size={12} />
          </span>
          {title}
        </h3>
        <div className="flex items-center gap-2.5">
          {trailing}
          <span className="text-[13px] font-semibold tabular-nums text-[var(--ink)]">
            {headline}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function ScoreTrack({ data }: { data: (number | null)[] }) {
  return (
    <div className="flex items-end justify-between gap-1 h-16">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
          {v != null ? (
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: scoreColor(v),
                marginBottom: `${(v - 1) * 11}px`,
              }}
              title={`${v}/5`}
            />
          ) : (
            <span className="w-1 h-1 rounded-full bg-[var(--line-2)] mb-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}

function Bars({
  data,
  color,
  target,
  unit,
}: {
  data: (number | null)[];
  color: string;
  target?: number;
  unit?: string;
}) {
  const max = Math.max(target ?? 0, ...data.map((v) => v ?? 0), 1);
  return (
    <div className="relative flex items-end justify-between gap-1 h-16">
      {target != null && (
        <span
          className="absolute left-0 right-0 border-t border-dashed pointer-events-none"
          style={{
            bottom: `${(target / max) * 100}%`,
            borderColor: "color-mix(in oklch, var(--ink) 18%, transparent)",
          }}
        />
      )}
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[3px] transition-all"
          style={{
            height: v ? `${Math.max(4, (v / max) * 100)}%` : "2px",
            background: v ? color : "var(--line-2)",
            opacity: v ? 1 : 0.6,
          }}
          title={v != null ? `${v}${unit ?? ""}` : "—"}
        />
      ))}
    </div>
  );
}

function Line({ data, unit }: { data: (number | null)[]; unit: WeightUnit }) {
  const pts = data
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) {
    return (
      <div className="h-16 grid place-items-center text-[12px] text-[var(--muted-2)]">
        Log weight a few days to see the trend.
      </div>
    );
  }
  const w = 320;
  const h = 64;
  const pad = 6;
  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const n = data.length - 1;
  const coords = pts.map((p) => {
    const x = pad + (p.i / n) * (w - pad * 2);
    const y = pad + (1 - (p.v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const dPath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = coords.at(-1)!;
  void unit;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <path
        d={dPath}
        fill="none"
        stroke="var(--gold)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--gold)" />
    </svg>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="life-card p-4">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.13em] font-semibold text-[var(--muted)]">
        <Icon size={12} style={{ color: tone }} />
        {label}
      </div>
      <div
        className="mt-1.5 text-[24px] font-semibold tabular-nums leading-none"
        style={{ color: tone }}
      >
        {value}
      </div>
    </div>
  );
}
