"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { Sun, BookHeart } from "lucide-react";
import Link from "next/link";
import { BlobImg } from "@/components/blob-img";
import { EmptyState, PageHeader } from "@/components/empty-state";

export default function JournalPage() {
  const rows = useItemsOfKind("journal") ?? [];

  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;
  const entriesWeek = rows.filter(
    (r) => new Date(r.capturedAt).getTime() >= weekAgo,
  ).length;
  const entriesMonth = rows.filter(
    (r) => new Date(r.capturedAt).getTime() >= monthAgo,
  ).length;

  // Streak: consecutive days ending today with an entry.
  const dates = new Set(
    rows.map((r) =>
      new Date(r.capturedAt).toISOString().slice(0, 10),
    ),
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    if (dates.has(d)) streak++;
    else if (i === 0) continue;
    else break;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader
        icon={BookHeart}
        title="Journal"
        subtitle="Daily notes, energy and mood, in your own words."
        tint="var(--kind-journal)"
        action={
          <Link
            href="/today"
            className="life-btn life-btn-primary"
          >
            Write today
          </Link>
        }
      />

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger">
          <Stat label="Entries" value={rows.length} tone="default" />
          <Stat label="This week" value={entriesWeek} tone="accent" />
          <Stat label="This month" value={entriesMonth} tone="default" />
          <Stat label="Streak" value={`${streak}d`} tone="fire" />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Sun}
          tint="var(--kind-journal)"
          title="Today's blank page is waiting."
          body="Three sentences is enough. Energy, mood, what happened. Future-you will thank past-you for the record."
          actions={[{ label: "Write today", href: "/today" }]}
        />
      ) : (
        <ul className="mt-8 space-y-3">
          {rows.map((j) => {
            const m = (j.metadata ?? {}) as {
              energy?: number;
              mood?: string;
              photos?: string[];
            };
            const firstPhoto = m.photos?.[0];
            return (
              <li key={j.id} className="life-card life-card-hover transition">
                <Link href={`/items/${j.id}`} className="block p-5">
                  <div className="flex gap-4">
                    {firstPhoto && (
                      <BlobImg
                        id={firstPhoto}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shrink-0 border border-[var(--border-soft)]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-faint)] flex-wrap">
                        <span>
                          {new Date(j.capturedAt).toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        {m.mood && <span className="text-base">{m.mood}</span>}
                        {m.energy != null && (
                          <span className="inline-flex items-center gap-1">
                            energy
                            <span className="font-mono text-[var(--text-muted)]">
                              {m.energy}/5
                            </span>
                          </span>
                        )}
                        {m.photos && m.photos.length > 1 && (
                          <span className="text-[var(--text-faint)]">
                            · {m.photos.length} photos
                          </span>
                        )}
                      </div>
                      {j.body && (
                        <p className="mt-3 text-sm text-[var(--text)] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                          {j.body}
                        </p>
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
  value: number | string;
  tone: "default" | "accent" | "fire";
}) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "fire"
      ? "text-orange-400"
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
