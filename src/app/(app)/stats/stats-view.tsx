"use client";

import { useMemo, useState } from "react";
import { BarChart3, Sparkles, Flame, Target, Clock, Calendar } from "lucide-react";

export type StatsItem = {
  id: string;
  kind: string;
  title: string | null;
  topic: string | null;
  capturedAt: Date;
  metadata: Record<string, unknown>;
};

type Range = "7d" | "30d" | "90d" | "all";

const RANGES: Array<{ value: Range; label: string; days: number | null }> = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "all", label: "All time", days: null },
];

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function StatsView({ items }: { items: StatsItem[] }) {
  const [range, setRange] = useState<Range>("30d");
  const rangeDays = RANGES.find((r) => r.value === range)?.days ?? null;

  const cutoff = useMemo(() => {
    if (rangeDays === null) return null;
    return new Date(Date.now() - rangeDays * 86_400_000);
  }, [rangeDays]);

  const inRange = useMemo(() => {
    if (!cutoff) return items;
    return items.filter((i) => new Date(i.capturedAt) >= cutoff);
  }, [items, cutoff]);

  // ----- aggregates -----

  const byKind = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of inRange) m.set(i.kind, (m.get(i.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inRange]);

  const tasks = inRange.filter((i) => i.kind === "task");
  const completedTasks = tasks.filter(
    (t) => (t.metadata as { completedAt?: string }).completedAt,
  );
  const completionRate =
    tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

  const habits = items.filter((i) => i.kind === "habit");
  const totalCheckins = habits.reduce(
    (sum, h) =>
      sum + ((h.metadata as { checkins?: string[] }).checkins?.length ?? 0),
    0,
  );

  const goals = items.filter((i) => i.kind === "goal");
  const avgGoalProgress =
    goals.length === 0
      ? 0
      : Math.round(
          goals.reduce(
            (s, g) => s + Number((g.metadata as { progress?: number }).progress ?? 0),
            0,
          ) / goals.length,
        );

  // Days bar chart
  const daysOfRange = rangeDays ?? 30;
  const dailyBuckets = useMemo(() => {
    const result: Array<{ day: string; count: number; date: Date }> = [];
    for (let i = daysOfRange - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const iso = ymd(d);
      const count = inRange.filter(
        (it) => ymd(new Date(it.capturedAt)) === iso,
      ).length;
      result.push({ day: iso, count, date: d });
    }
    return result;
  }, [inRange, daysOfRange]);

  const maxDay = Math.max(...dailyBuckets.map((d) => d.count), 1);
  const totalInRange = inRange.length;
  const dailyAvg =
    rangeDays && rangeDays > 0
      ? (totalInRange / rangeDays).toFixed(1)
      : (totalInRange / 30).toFixed(1);

  // Day-of-week distribution
  const byDow = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun..Sat
    for (const i of inRange) {
      const day = new Date(i.capturedAt).getDay();
      counts[day]++;
    }
    return counts;
  }, [inRange]);

  // Hour-of-day heatmap
  const byHour = useMemo(() => {
    const counts = new Array(24).fill(0);
    for (const i of inRange) {
      counts[new Date(i.capturedAt).getHours()]++;
    }
    return counts;
  }, [inRange]);
  const maxHour = Math.max(...byHour, 1);

  // Top topics
  const topTopics = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of inRange) {
      if (!i.topic) continue;
      m.set(i.topic, (m.get(i.topic) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [inRange]);

  // Mood/energy trend from journal entries
  const journalTrend = useMemo(() => {
    return inRange
      .filter((i) => i.kind === "journal")
      .map((i) => {
        const m = i.metadata as { energy?: number; mood?: string };
        return {
          date: new Date(i.capturedAt),
          energy: m.energy ?? null,
          mood: m.mood ?? null,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [inRange]);

  const avgEnergy =
    journalTrend.length === 0
      ? null
      : (
          journalTrend.reduce((s, j) => s + (j.energy ?? 0), 0) /
          journalTrend.length
        ).toFixed(1);

  return (
    <div>
      {/* Time range tabs */}
      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-soft)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${
                range === r.value
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-faint)]">
          {totalInRange} item{totalInRange === 1 ? "" : "s"} in window · avg {dailyAvg}/day
        </span>
      </div>

      {/* Top tiles */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Captures" value={totalInRange} icon={Sparkles} />
        <Tile
          label="Tasks done"
          value={`${completedTasks.length} / ${tasks.length}`}
          sub={`${completionRate}% done`}
          icon={BarChart3}
        />
        <Tile label="Habit check-ins" value={totalCheckins} icon={Flame} />
        <Tile
          label="Avg goal"
          value={`${avgGoalProgress}%`}
          sub={`${goals.length} goals`}
          icon={Target}
        />
      </div>

      {/* Daily bar chart */}
      <section className="mt-8">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          Captures per day
        </h2>
        <div className="life-card p-5">
          <div className="flex items-end gap-1 h-32">
            {dailyBuckets.map((d) => (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center justify-end h-full"
                title={`${d.day}: ${d.count}`}
              >
                <div
                  className="w-full rounded-t bg-[var(--accent)] transition-all"
                  style={{
                    height: `${(d.count / maxDay) * 100}%`,
                    minHeight: d.count > 0 ? 3 : 0,
                    opacity: 0.35 + (d.count / maxDay) * 0.65,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[9px] text-[var(--text-faint)] tabular-nums">
            {dailyBuckets.map((d, i) => (
              <div key={d.day} className="flex-1 text-center">
                {dailyBuckets.length <= 14 || i % Math.ceil(dailyBuckets.length / 14) === 0
                  ? d.date.toLocaleDateString(undefined, { day: "numeric", month: i === 0 ? "short" : undefined })
                  : ""}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two-column: by-kind + by-dow */}
      <section className="mt-8 grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
            By kind
          </h2>
          <div className="life-card p-5 space-y-2">
            {byKind.length === 0 && (
              <p className="text-sm text-[var(--text-faint)]">Nothing in this window.</p>
            )}
            {byKind.map(([kind, n]) => {
              const pct = (n / totalInRange) * 100;
              return (
                <div key={kind} className="flex items-center gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: `var(--kind-${kind})` }}
                  />
                  <span className="w-20 text-xs text-[var(--text-muted)] uppercase tracking-wide">
                    {kind}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: `var(--kind-${kind})` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-[var(--text-faint)] tabular-nums">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-1.5">
            <Calendar size={11} />
            Day of week
          </h2>
          <div className="life-card p-5">
            <div className="grid grid-cols-7 gap-1.5 items-end h-24">
              {byDow.map((n, i) => {
                const max = Math.max(...byDow, 1);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-end h-full"
                    title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}: ${n}`}
                  >
                    <div
                      className="w-full rounded-t bg-[var(--accent)] transition-all"
                      style={{
                        height: `${(n / max) * 100}%`,
                        minHeight: n > 0 ? 3 : 0,
                        opacity: 0.4 + (n / max) * 0.6,
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5 text-[10px] text-[var(--text-faint)] text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hour-of-day heatmap */}
      <section className="mt-8">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-1.5">
          <Clock size={11} />
          Hour of day
        </h2>
        <div className="life-card p-5">
          <div className="flex gap-1">
            {byHour.map((n, h) => (
              <div
                key={h}
                title={`${h}:00 — ${n} item${n === 1 ? "" : "s"}`}
                className="flex-1 aspect-square rounded transition"
                style={{
                  background:
                    n === 0
                      ? "var(--border-soft)"
                      : `color-mix(in oklch, var(--accent) ${10 + (n / maxHour) * 90}%, var(--border-soft))`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-1 text-[9px] text-[var(--text-faint)] tabular-nums">
            {byHour.map((_, h) => (
              <div key={h} className="flex-1 text-center">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top topics + journal trend */}
      <section className="mt-8 grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
            Top topics
          </h2>
          <div className="life-card p-5 space-y-2">
            {topTopics.length === 0 && (
              <p className="text-sm text-[var(--text-faint)]">
                Topics show up after AI enriches captures.
              </p>
            )}
            {topTopics.map(([t, n]) => {
              const max = topTopics[0][1];
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-[var(--text)] truncate">
                    #{t}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-[var(--text-faint)] tabular-nums">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
            Journal — avg energy {avgEnergy ?? "—"} / 5
          </h2>
          <div className="life-card p-5">
            {journalTrend.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">
                Log a journal entry from <em>/today</em> to start tracking.
              </p>
            ) : (
              <div className="flex items-end gap-1.5 h-20">
                {journalTrend.map((j, i) => {
                  const e = j.energy ?? 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      title={`${j.date.toLocaleDateString()} · energy ${e}/5${j.mood ? " · " + j.mood : ""}`}
                    >
                      <div
                        className="w-full rounded-t bg-[var(--kind-journal)]"
                        style={{
                          height: `${(e / 5) * 100}%`,
                          minHeight: e > 0 ? 3 : 0,
                          opacity: 0.4 + (e / 5) * 0.6,
                        }}
                      />
                      {j.mood && (
                        <span className="text-[10px] mt-1">{j.mood}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="life-card p-4">
      <div className="flex items-center justify-between text-[var(--text-faint)]">
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
        <Icon size={12} />
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--text)]">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-[var(--text-faint)]">{sub}</div>
      )}
    </div>
  );
}
