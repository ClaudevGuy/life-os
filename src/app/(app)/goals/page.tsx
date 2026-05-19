"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Target } from "lucide-react";
import Link from "next/link";
import { NewGoal } from "./new-goal";

export default function GoalsPage() {
  const rows = useItemsOfKind("goal") ?? [];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Target size={18} className="text-[var(--accent)]" />
            Goals
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            What you&apos;re aiming at. Track progress, not just intent.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-faint)]">
            {rows.length} active
          </span>
          <NewGoal />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 life-stagger">
        {rows.map((g) => {
          const meta = (g.metadata ?? {}) as {
            targetDate?: string | null;
            progress?: number;
            milestones?: string[];
          };
          const progress = Math.max(0, Math.min(100, meta.progress ?? 0));
          const target = meta.targetDate ? new Date(meta.targetDate) : null;

          return (
            <Link
              key={g.id}
              href={`/items/${g.id}`}
              className="life-card life-card-hover p-5 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                    {g.topic ?? "goal"}
                  </div>
                  <div className="mt-1 text-sm font-medium truncate">
                    {g.title}
                  </div>
                </div>
                <div className="text-xs text-[var(--text-muted)] tabular-nums">
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
                  className="h-full bg-[var(--accent)] rounded-full"
                  style={{ width: `${progress}%` }}
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
