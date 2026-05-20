"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Target } from "lucide-react";
import Link from "next/link";
import { NewGoal } from "./new-goal";
import { EmptyState, PageHeader } from "@/components/empty-state";

export default function GoalsPage() {
  const rows = useItemsOfKind("goal") ?? [];

  const active = rows.filter((g) => {
    const m = (g.metadata ?? {}) as { progress?: number };
    return (m.progress ?? 0) < 100;
  });
  const completed = rows.filter((g) => {
    const m = (g.metadata ?? {}) as { progress?: number };
    return (m.progress ?? 0) >= 100;
  });
  const avg = active.length
    ? Math.round(
        active.reduce((sum, g) => {
          const m = (g.metadata ?? {}) as { progress?: number };
          return sum + (m.progress ?? 0);
        }, 0) / active.length,
      )
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        icon={Target}
        title="Goals"
        subtitle="What you're aiming at. Track progress, not just intent."
        tint="var(--kind-goal)"
        action={<NewGoal />}
      />

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 life-stagger">
          <Stat label="Active" value={active.length} tone="default" />
          <Stat label="Avg progress" value={`${avg}%`} tone="accent" />
          <Stat label="Completed" value={completed.length} tone="good" />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          tint="var(--kind-goal)"
          title="What are you aiming at?"
          body="A goal needs a number, a deadline, and a reason. Without progress you can't tell intent from drift."
          actions={[{ label: "New goal", onClickKey: "c" }]}
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 life-stagger">
          {rows.map((g) => {
            const meta = (g.metadata ?? {}) as {
              targetDate?: string | null;
              progress?: number;
              milestones?: string[];
            };
            const progress = Math.max(0, Math.min(100, meta.progress ?? 0));
            const target = meta.targetDate ? new Date(meta.targetDate) : null;
            const done = progress >= 100;

            return (
              <Link
                key={g.id}
                href={`/items/${g.id}`}
                className="life-card life-card-hover p-5 transition relative overflow-hidden"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r opacity-60"
                  style={{
                    background: done ? "#6dc8a1" : "var(--kind-goal)",
                  }}
                />
                <div className="pl-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                        {g.topic ?? "goal"}
                      </div>
                      <div className="mt-1 text-sm font-medium truncate">
                        {g.title}
                      </div>
                    </div>
                    <div
                      className={`text-xs tabular-nums font-mono ${
                        done ? "text-emerald-300" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {progress}%
                    </div>
                  </div>

                  {g.summary && (
                    <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {g.summary}
                    </p>
                  )}

                  <div className="mt-4 h-1.5 rounded-full bg-[var(--border-soft)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress}%`,
                        background: done ? "#6dc8a1" : "var(--accent)",
                        boxShadow:
                          progress > 0
                            ? `0 0 8px color-mix(in oklch, ${
                                done ? "#6dc8a1" : "var(--accent)"
                              } 50%, transparent)`
                            : undefined,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
                    {target && (
                      <span>
                        target{" "}
                        {target.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "2-digit",
                        })}
                      </span>
                    )}
                    {meta.milestones && meta.milestones.length > 0 && (
                      <span>· {meta.milestones.length} milestones</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "default" | "accent" | "good";
}) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
      ? "text-emerald-300"
      : "text-[var(--text)]";
  return (
    <div className="life-card p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}
