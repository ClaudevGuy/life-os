"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useItemsOfKind, type StoredItem } from "@/lib/store/items";
import { Target } from "lucide-react";
import { NewGoal } from "./new-goal";

const STUDIO_PALETTE = [
  "var(--terra)",
  "var(--gold)",
  "var(--sage)",
  "var(--plum)",
  "var(--sky)",
];
const STUDIO_TINTS: Record<string, string> = {
  "var(--terra)": "var(--terra-tint)",
  "var(--gold)": "var(--gold-tint)",
  "var(--sage)": "var(--sage-tint)",
  "var(--plum)": "var(--plum-tint)",
  "var(--sky)": "var(--sky-tint)",
};

function goalColor(g: StoredItem): string {
  const seed = g.title ?? g.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return STUDIO_PALETTE[Math.abs(hash) % STUDIO_PALETTE.length];
}

function progressOf(g: StoredItem): number {
  const m = (g.metadata ?? {}) as { progress?: number };
  return Math.max(0, Math.min(100, m.progress ?? 0));
}

function scopeLabel(g: StoredItem): string {
  // Heuristic from targetDate so we don't need a new schema field:
  // < 4 months → QUARTER, < 18 months → YEAR, else MULTI-YEAR. Defaults YEAR.
  const m = (g.metadata ?? {}) as { targetDate?: string | null };
  if (!m.targetDate) return "Year";
  const target = new Date(m.targetDate);
  const diffMonths =
    (target.getFullYear() - new Date().getFullYear()) * 12 +
    (target.getMonth() - new Date().getMonth());
  if (diffMonths <= 4) return "Quarter";
  if (diffMonths >= 18) return "Multi-year";
  return "Year";
}

function yearProgressPct(now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
  return ((now.getTime() - start) / (end - start)) * 100;
}

export default function GoalsPage() {
  const rows = (useItemsOfKind("goal") ?? []) as StoredItem[];
  const yearPct = useMemo(() => yearProgressPct(), []);

  return (
    <div className="p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Target
              size={20}
              strokeWidth={1.6}
              className="text-[var(--terra)]"
            />
            Goals
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            The year in arcs, not lists.
          </p>
        </div>
        <NewGoal />
      </header>

      {rows.length === 0 ? (
        <EmptyHero />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 life-stagger">
            {rows.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>

          <YearAtAGlance goals={rows} yearPct={yearPct} />
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Goal card
// ──────────────────────────────────────────────────────────────────────

function GoalCard({ goal: g }: { goal: StoredItem }) {
  const pct = progressOf(g);
  const color = goalColor(g);
  const tint = STUDIO_TINTS[color] ?? "var(--paper-2)";
  const scope = scopeLabel(g);

  return (
    <div className="life-card life-card-hover p-6 flex items-center gap-6 min-h-[176px]">
      <ArcProgress pct={pct} color={color} size={120} />
      <div className="min-w-0 flex flex-col gap-3 flex-1">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] self-start"
          style={{ color, background: tint }}
        >
          {scope}
        </span>
        <h3 className="text-[22px] font-semibold tracking-[-0.02em] leading-[1.15] text-[var(--ink)] line-clamp-2">
          {g.title?.trim() || (
            <em className="text-[var(--muted-2)] not-italic">Untitled</em>
          )}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-[12px] text-[var(--muted)] tabular-nums">
            {pct}% complete
          </span>
          <Link
            href={`/items/${g.id}`}
            className="life-btn life-btn-sm life-btn-ghost"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}

function ArcProgress({
  pct,
  color,
  size = 120,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const stroke = 8;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label={`${pct}% complete`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--bg-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-sans)"
        fontSize={size * 0.22}
        fontWeight={600}
        letterSpacing="-0.02em"
        fill="var(--ink)"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Year-at-a-glance
// ──────────────────────────────────────────────────────────────────────

function YearAtAGlance({
  goals,
  yearPct,
}: {
  goals: StoredItem[];
  yearPct: number;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3">
        Year at a glance
      </h2>
      <div className="life-card p-6">
        <div
          className="grid items-center gap-x-4 gap-y-4"
          style={{ gridTemplateColumns: "minmax(80px, 110px) 1fr 50px" }}
        >
          {goals.map((g) => {
            const pct = progressOf(g);
            const color = goalColor(g);
            const short = (g.title ?? "Untitled")
              .split(" ")
              .slice(0, 2)
              .join(" ");
            return (
              <YearRow
                key={g.id}
                label={short}
                pct={pct}
                color={color}
                yearPct={yearPct}
              />
            );
          })}
        </div>
        <div className="mt-5 flex items-center gap-2.5 text-[11.5px] text-[var(--muted)]">
          <span
            aria-hidden
            className="block"
            style={{
              width: 1.5,
              height: 12,
              background: "var(--muted-2)",
            }}
          />
          Year is {Math.round(yearPct)}% complete · You&apos;d ideally average{" "}
          {Math.round(yearPct)}%.
        </div>
      </div>
    </section>
  );
}

function YearRow({
  label,
  pct,
  color,
  yearPct,
}: {
  label: string;
  pct: number;
  color: string;
  yearPct: number;
}) {
  return (
    <>
      <span className="text-[13px] text-[var(--ink-2)] truncate">{label}</span>
      <div
        className="relative h-[8px] rounded-full overflow-hidden"
        style={{ background: "var(--bg-2)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
        <div
          aria-hidden
          className="absolute inset-y-0"
          style={{
            left: `${yearPct}%`,
            width: 1.5,
            background: "var(--muted-2)",
            opacity: 0.8,
          }}
          title="Today"
        />
      </div>
      <span
        className="font-mono text-[11.5px] tabular-nums text-right"
        style={{ color }}
      >
        {Math.round(pct)}%
      </span>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Empty
// ──────────────────────────────────────────────────────────────────────

function EmptyHero() {
  return (
    <div className="mt-2 rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Target size={22} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-medium text-[var(--ink)]">
        What are you aiming at?
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        A goal needs a number, a deadline, and a reason. Without progress you
        can&apos;t tell intent from drift.
      </p>
    </div>
  );
}
