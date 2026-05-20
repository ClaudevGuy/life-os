"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Lightbulb, AlertCircle } from "lucide-react";
import Link from "next/link";
import { NewDecision } from "./new-decision";
import { EmptyState, PageHeader } from "@/components/empty-state";

export default function DecisionsPage() {
  const rows = useItemsOfKind("decision") ?? [];

  const now = new Date();
  let pending = 0;
  let dueForReview = 0;
  let resolved = 0;
  for (const d of rows) {
    const m = (d.metadata ?? {}) as { reviewAt?: string; outcome?: string };
    const outcome = m.outcome ?? "pending";
    if (outcome === "pending") {
      pending++;
      if (m.reviewAt && new Date(m.reviewAt) <= now) dueForReview++;
    } else {
      resolved++;
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader
        icon={Lightbulb}
        title="Decisions"
        subtitle="Log decisions with reasoning. Review them when the time comes."
        tint="var(--kind-decision)"
        action={<NewDecision />}
      />

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3 life-stagger">
          <Stat label="Pending" value={pending} tone="default" />
          <Stat label="Due for review" value={dueForReview} tone="warn" />
          <Stat label="Resolved" value={resolved} tone="good" />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          tint="var(--kind-decision)"
          title="No decisions yet."
          body="Every meaningful decision is worth a paragraph: what you chose, what you considered, and when you'll review whether it worked."
          actions={[{ label: "Capture one", onClickKey: "c" }]}
        />
      ) : (
        <ul className="mt-6 space-y-1.5 life-stagger">
          {rows.map((d) => {
            const meta = (d.metadata ?? {}) as {
              reviewAt?: string | null;
              outcome?: string;
            };
            const reviewDate = meta.reviewAt ? new Date(meta.reviewAt) : null;
            const outcome = meta.outcome ?? "pending";
            const isDue =
              reviewDate &&
              reviewDate <= now &&
              outcome === "pending";
            const resolved = outcome !== "pending";

            return (
              <li
                key={d.id}
                className="life-card life-card-hover transition group relative overflow-hidden"
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r opacity-70"
                  style={{
                    background: isDue
                      ? "#ef8b8b"
                      : resolved
                      ? "#6dc8a1"
                      : "var(--kind-decision)",
                  }}
                />
                <Link
                  href={`/items/${d.id}`}
                  className="flex items-start gap-3 p-3.5 pl-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[var(--text)] truncate">
                      {d.title ?? "untitled"}
                    </div>
                    {d.body && (
                      <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {d.body}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-faint)] uppercase tracking-wide">
                      <span
                        className={
                          resolved
                            ? "text-emerald-300"
                            : isDue
                            ? "text-[#ef8b8b]"
                            : "text-[var(--text-muted)]"
                        }
                      >
                        {outcome}
                      </span>
                      {reviewDate && (
                        <span>
                          · review{" "}
                          {reviewDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {isDue && (
                        <span className="inline-flex items-center gap-1 text-[#ef8b8b]">
                          <AlertCircle size={10} />
                          due now
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
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
  value: number;
  tone: "default" | "warn" | "good";
}) {
  const colorClass =
    tone === "warn"
      ? "text-[#ef8b8b]"
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
