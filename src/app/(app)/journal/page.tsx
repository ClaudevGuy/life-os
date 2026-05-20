"use client";

import { useItemsOfKind, useJournalToday } from "@/lib/store/items";
import { BookHeart } from "lucide-react";
import Link from "next/link";
import { BlobImg } from "@/components/blob-img";
import { JournalForm } from "../today/journal-form";

const SCALE_COLORS: Record<number, string> = {
  1: "var(--muted-2)",
  2: "var(--gold)",
  3: "var(--terra)",
  4: "var(--plum)",
  5: "var(--sky)",
};
const ENERGY_BY_MOOD: Record<string, number> = {
  "😫": 1,
  "😕": 2,
  "😐": 3,
  "🙂": 4,
  "😄": 5,
};

function relativeLabel(when: Date) {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startEntry = new Date(when);
  startEntry.setHours(0, 0, 0, 0);
  const days = Math.round(
    (startToday.getTime() - startEntry.getTime()) / 86_400_000,
  );
  if (days === 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  if (days < 7) return when.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  return when.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
}

export default function JournalPage() {
  const rows = useItemsOfKind("journal") ?? [];
  const journalToday = useJournalToday() ?? null;

  // Past entries = everything except today's entry. Newest first.
  const todayId = journalToday?.id;
  const past = rows
    .filter((r) => r.id !== todayId)
    .sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6">
        <h1 className="life-h1 inline-flex items-center gap-2">
          <BookHeart size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
          Journal
        </h1>
        <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
          Free-write. No grade, no algorithm. Just you on the page.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <JournalForm existing={journalToday} />

        <aside>
          <h2 className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold mb-3 px-1">
            Past entries
          </h2>
          {past.length === 0 ? (
            <div
              className="rounded-[12px] border border-dashed border-[var(--line-2)] p-6 text-center text-[13px] text-[var(--muted)]"
            >
              Your past entries will appear here.
            </div>
          ) : (
            <ul className="space-y-2.5 life-stagger">
              {past.map((j) => {
                const m = (j.metadata ?? {}) as {
                  energy?: number;
                  mood?: string;
                  photos?: string[];
                };
                const energy =
                  m.energy ??
                  (m.mood ? ENERGY_BY_MOOD[m.mood] : undefined) ??
                  3;
                const dot = SCALE_COLORS[energy] ?? "var(--muted-2)";
                const firstPhoto = m.photos?.[0];
                const when = new Date(j.capturedAt);
                return (
                  <li key={j.id} className="life-card life-card-hover">
                    <Link href={`/items/${j.id}`} className="block p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-[10px] h-[10px] rounded-full shrink-0"
                          style={{ background: dot }}
                        />
                        <span className="text-[14px] font-medium text-[var(--ink)] truncate flex-1">
                          {when.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted-2)] font-semibold">
                          {relativeLabel(when)}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-3">
                        {firstPhoto && (
                          <BlobImg
                            id={firstPhoto}
                            className="w-12 h-12 rounded-md object-cover shrink-0 border border-[var(--line)]"
                          />
                        )}
                        {j.body && (
                          <p className="text-[13px] text-[var(--ink-2)] leading-relaxed line-clamp-2">
                            {j.body}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
