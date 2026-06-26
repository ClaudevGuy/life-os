"use client";

import { useMemo, useState } from "react";
import { Trophy, Scale } from "lucide-react";
import {
  useHealthLogs,
  saveHealthLog,
  kgToUnit,
  unitToKg,
  type WeightUnit,
} from "@/lib/store/health";
import { ymd } from "@/lib/ymd";
import {
  focusColor,
  MUSCLE_LABEL,
  type MuscleGroup,
  type Workout,
} from "@/lib/gym/types";
import {
  thisWeekCount,
  streakWeeks,
  volumeInPeriod,
  muscleBalance,
  splitBalance,
  recentPRs,
} from "@/lib/gym/calc";
import { StatTile, fmtWeight } from "./ui";

export function StatsTab({
  workouts,
  unit,
}: {
  workouts: Workout[] | undefined;
  unit: WeightUnit;
}) {
  const ws = workouts ?? [];
  const stats = useMemo(() => {
    return {
      week: thisWeekCount(ws),
      streak: streakWeeks(ws),
      vol7: volumeInPeriod(ws, 7),
      total: ws.length,
      split: Object.entries(splitBalance(ws, 30)).sort((a, b) => b[1] - a[1]),
      muscle: Object.entries(muscleBalance(ws, 30)).sort(
        (a, b) => b[1] - a[1],
      ) as [MuscleGroup, number][],
      prs: recentPRs(ws, 30),
    };
  }, [ws]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="This week" value={String(stats.week)} suffix="workouts" tone="var(--terra)" />
        <StatTile label="Streak" value={String(stats.streak)} suffix={stats.streak === 1 ? "week" : "weeks"} tone="var(--sage)" />
        <StatTile label="Volume · 7d" value={fmtWeight(stats.vol7, unit)} suffix={unit} tone="var(--gold)" />
        <StatTile label="Total" value={String(stats.total)} suffix="logged" tone="var(--sky)" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="life-card p-5">
          <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3">
            Split · 30 days
          </h3>
          {stats.split.length === 0 ? (
            <p className="text-[12.5px] text-[var(--muted)]">No workouts yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.split.map(([focus, n]) => (
                <BarRow
                  key={focus}
                  label={focus}
                  value={`${n}`}
                  frac={n / stats.split[0][1]}
                  color={focusColor(focus)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="life-card p-5">
          <h3 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3">
            Muscle focus · 30 days
          </h3>
          {stats.muscle.length === 0 ? (
            <p className="text-[12.5px] text-[var(--muted)]">No sets logged yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.muscle.map(([m, n]) => (
                <BarRow
                  key={m}
                  label={MUSCLE_LABEL[m]}
                  value={`${n} sets`}
                  frac={n / stats.muscle[0][1]}
                  color="var(--terra)"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="life-card p-5">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3">
          <Trophy size={13} className="text-[var(--gold)]" />
          Recent PRs
        </h3>
        {stats.prs.length === 0 ? (
          <p className="text-[12.5px] text-[var(--muted)]">
            Beat a previous best and it&apos;ll show up here.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {stats.prs.slice(0, 8).map((pr, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-[13px] font-medium text-[var(--ink)] truncate">
                  {pr.name}
                </span>
                <span className="text-[12px] tabular-nums text-[var(--muted)] shrink-0 ml-3">
                  {fmtWeight(pr.weightKg, unit)} {unit} × {pr.reps}
                  <span className="text-[var(--muted-2)]">
                    {" "}
                    · {new Date(`${pr.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BodyStats unit={unit} />
    </div>
  );
}

function BarRow({
  label,
  value,
  frac,
  color,
}: {
  label: string;
  value: string;
  frac: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[12px] text-[var(--ink-2)] truncate">
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(6, frac * 100)}%`, background: color }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-[11.5px] tabular-nums text-[var(--muted)]">
        {value}
      </span>
    </div>
  );
}

function BodyStats({ unit }: { unit: WeightUnit }) {
  const logs = useHealthLogs(90) ?? [];
  const today = ymd(new Date());

  const weights = logs.filter(
    (l): l is typeof l & { weightKg: number } => typeof l.weightKg === "number",
  );
  const current = weights.at(-1)?.weightKg ?? null;
  const first = weights[0]?.weightKg ?? null;
  const delta = current != null && first != null ? current - first : null;
  const todayKg = logs.find((l) => l.date === today)?.weightKg;

  return (
    <div className="life-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          <Scale size={13} className="text-[var(--gold)]" />
          Bodyweight
        </h3>
        {delta != null && Math.abs(delta) >= 0.05 && (
          <span
            className="text-[11.5px] font-medium tabular-nums"
            style={{ color: delta <= 0 ? "var(--sage)" : "var(--gold)" }}
          >
            {delta > 0 ? "+" : ""}
            {fmtWeight(delta, unit)} {unit}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-[26px] font-semibold tabular-nums leading-none text-[var(--ink)]">
            {current != null ? fmtWeight(current, unit) : "—"}
            <span className="text-[13px] text-[var(--muted)] ml-1">{unit}</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">
            Log today:
          </div>
          <WeightLogInput
            kg={todayKg}
            unit={unit}
            onChange={(kg) => void saveHealthLog(today, { weightKg: kg })}
          />
        </div>
        {weights.length >= 2 && (
          <div className="flex-1 min-w-[160px]">
            <Spark data={weights.map((w) => w.weightKg)} />
          </div>
        )}
      </div>
    </div>
  );
}

function WeightLogInput({
  kg,
  unit,
  onChange,
}: {
  kg: number | undefined;
  unit: WeightUnit;
  onChange: (kg: number | undefined) => void;
}) {
  const [text, setText] = useState(
    kg != null ? String(Math.round(kgToUnit(kg, unit) * 10) / 10) : "",
  );
  return (
    <div className="mt-1 inline-flex items-center rounded-[9px] border border-[var(--line)] bg-[var(--paper-2)] px-2.5 h-9 focus-within:border-[var(--terra)] transition">
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (!v.trim()) return onChange(undefined);
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) onChange(unitToKg(n, unit));
        }}
        placeholder="—"
        className="w-14 bg-transparent text-[15px] font-semibold tabular-nums text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
      />
      <span className="text-[12px] text-[var(--muted)] uppercase">{unit}</span>
    </div>
  );
}

function Spark({ data }: { data: number[] }) {
  const w = 320;
  const h = 56;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length - 1;
  const coords = data.map((v, i) => {
    const x = pad + (i / n) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = coords.at(-1)!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <path
        d={d}
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
