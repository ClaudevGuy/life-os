"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import { NewDecision } from "./new-decision";
import { EmptyState } from "@/components/empty-state";

export default function DecisionsPage() {
  const rows = useItemsOfKind("decision") ?? [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Lightbulb size={18} className="text-[var(--accent)]" />
            Decisions
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Log decisions with reasoning. Review them when the time comes.
          </p>
        </div>
        <NewDecision />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          tint="var(--kind-decision)"
          title="No decisions yet."
          body="Every meaningful decision is worth a paragraph: what you chose, what you considered, and when you'll review whether it worked."
          actions={[
            { label: "New decision", href: "#" },
            { label: "or capture", onClickKey: "c" },
          ]}
        />
      ) : (
        <ul className="mt-6 space-y-1.5 life-stagger">
          {rows.map((d) => {
            const meta = (d.metadata ?? {}) as {
              reviewAt?: string | null;
              outcome?: string;
            };
            const reviewDate = meta.reviewAt ? new Date(meta.reviewAt) : null;
            const isDue =
              reviewDate &&
              reviewDate <= new Date() &&
              (meta.outcome ?? "pending") === "pending";
            return (
              <li
                key={d.id}
                className="rounded-lg border border-zinc-900 bg-zinc-950 hover:border-zinc-800 transition"
              >
                <Link
                  href={`/items/${d.id}`}
                  className="flex items-start gap-3 p-3.5"
                >
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full ${
                      isDue ? "bg-amber-400" : "bg-zinc-700"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {d.title ?? "untitled"}
                    </div>
                    {d.body && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                        {d.body}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-600">
                      <span className="uppercase tracking-wide">
                        {meta.outcome ?? "pending"}
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
                        <span className="text-amber-400">· due</span>
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
