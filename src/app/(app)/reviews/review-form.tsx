"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import type { StoredItem as Item } from "@/lib/store/items";
import { captureItem, updateItem } from "@/lib/store/items";

const PROMPTS = [
  {
    n: 1,
    q: "What's one thing that went better than expected?",
    hint: "Look at completed tasks, shipped items, kind reactions.",
  },
  {
    n: 2,
    q: "What's the most important thing you learned?",
    hint: "Highlights, notes, decisions you'd revisit.",
  },
  {
    n: 3,
    q: "What's the one thing you'll do differently next week?",
    hint: "Be specific. Tie it to a goal or habit.",
  },
] as const;

function parseExisting(body: string | null): Record<number, string> {
  if (!body) return {};
  const result: Record<number, string> = {};
  const lines = body.split("\n");
  let current: number | null = null;
  let buf: string[] = [];
  for (const line of lines) {
    const match = /^##\s+(\d+)\./.exec(line);
    if (match) {
      if (current !== null) result[current] = buf.join("\n").trim();
      current = parseInt(match[1], 10);
      buf = [];
    } else if (current !== null) {
      buf.push(line);
    }
  }
  if (current !== null) result[current] = buf.join("\n").trim();
  return result;
}

function compose(answers: Record<number, string>): string {
  return PROMPTS.map(
    (p) => `## ${p.n}. ${p.q}\n\n${(answers[p.n] ?? "").trim()}\n`,
  ).join("\n");
}

export function WeeklyReviewForm({
  weekKey,
  existing,
}: {
  weekKey: string;
  existing: Item | null;
}) {
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<number, string>>(
    parseExisting(existing?.body ?? null),
  );
  const [savedAt, setSavedAt] = useState<Date | null>(
    existing ? new Date(existing.updatedAt) : null,
  );

  // Auto-save 1s after user stops typing
  useEffect(() => {
    if (Object.keys(answers).length === 0) return;
    const t = setTimeout(() => {
      void save();
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  async function save() {
    startTransition(async () => {
      const body = compose(answers);
      try {
        if (existing) {
          await updateItem(existing.id, {
            body,
            metadata: { ...(existing.metadata ?? {}), reviewWeek: weekKey },
          });
        } else {
          await captureItem({
            kind: "note",
            title: `Weekly review · ${weekKey}`,
            body,
            metadata: { reviewWeek: weekKey, isReview: true },
          });
        }
        setSavedAt(new Date());
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          Prompts · week of {weekKey}
        </h2>
        {savedAt && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 uppercase tracking-wide">
            <Check size={11} />
            saved {timeAgo(savedAt)}
          </span>
        )}
      </div>

      {PROMPTS.map((p) => (
        <div key={p.n} className="life-card p-5">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] tabular-nums">
              0{p.n}
            </span>
            <div className="flex-1">
              <h3 className="text-base font-medium text-[var(--text)]">{p.q}</h3>
              <p className="mt-0.5 text-xs text-[var(--text-faint)]">{p.hint}</p>
              <textarea
                rows={3}
                value={answers[p.n] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [p.n]: e.target.value }))
                }
                placeholder="Your answer…"
                className="mt-3 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center text-xs text-[var(--text-faint)]">
        <span>Saves automatically while you type.</span>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1.5 font-medium hover:brightness-110 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save now"}
        </button>
      </div>
    </div>
  );
}

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}
