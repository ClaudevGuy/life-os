"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Sparkles, Pencil } from "lucide-react";

// ---------- Decision outcome ----------

const OUTCOMES = [
  { value: "good", label: "Worked out" },
  { value: "bad", label: "Wrong call" },
  { value: "mixed", label: "Mixed" },
  { value: "pending", label: "Still TBD" },
] as const;

export function DecisionOutcomeEditor({
  id,
  metadata,
}: {
  id: string;
  metadata: Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewAt, setReviewAt] = useState<string>(
    (metadata.reviewAt as string | undefined)?.slice(0, 10) ??
      new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
  );
  const [outcome, setOutcome] = useState<string>(
    (metadata.outcome as string | undefined) ?? "pending",
  );
  const [note, setNote] = useState<string>(
    (metadata.outcomeNote as string | undefined) ?? "",
  );

  function save(partial: { outcome?: string; reviewAt?: string; outcomeNote?: string }) {
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metadata: { ...metadata, ...partial },
        }),
      });
      if (!res.ok) {
        toast.error("Couldn't update");
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  }

  return (
    <div className="mt-10 life-card p-5">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
        Review
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              setOutcome(o.value);
              save({ outcome: o.value });
            }}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition ${
              outcome === o.value
                ? o.value === "good"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : o.value === "bad"
                  ? "bg-red-500/15 text-red-300"
                  : o.value === "mixed"
                  ? "bg-amber-500/15 text-amber-300"
                  : "bg-[var(--bg-card-hover)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {outcome === o.value && <Check size={11} />}
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Review on
          </span>
          <input
            type="date"
            value={reviewAt}
            onChange={(e) => {
              setReviewAt(e.target.value);
              save({
                reviewAt: new Date(`${e.target.value}T09:00:00`).toISOString(),
              });
            }}
            className="rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Outcome note (private)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => save({ outcomeNote: note })}
            placeholder="What did you learn?"
            className="rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </label>
      </div>
    </div>
  );
}

// ---------- Goal progress + milestones ----------

export function GoalProgressEditor({
  id,
  metadata,
}: {
  id: string;
  metadata: Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<number>(
    Math.max(0, Math.min(100, Number(metadata.progress ?? 0))),
  );
  const milestones = (metadata.milestones as string[] | undefined) ?? [];
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(
    (metadata.completedMilestones as string[] | undefined) ?? [],
  );

  function patch(partial: Record<string, unknown>) {
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metadata: { ...metadata, ...partial },
        }),
      });
      if (!res.ok) {
        toast.error("Couldn't update");
        return;
      }
      router.refresh();
    });
  }

  function commitProgress() {
    patch({ progress });
  }

  function toggleMilestone(m: string) {
    const next = completedMilestones.includes(m)
      ? completedMilestones.filter((x) => x !== m)
      : [...completedMilestones, m];
    setCompletedMilestones(next);
    // Auto-derive progress from milestones if any exist
    const newProgress =
      milestones.length > 0
        ? Math.round((next.length / milestones.length) * 100)
        : progress;
    setProgress(newProgress);
    patch({ completedMilestones: next, progress: newProgress });
  }

  return (
    <div className="mt-10 life-card p-5">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
        Progress
      </h3>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onMouseUp={commitProgress}
          onTouchEnd={commitProgress}
          disabled={pending}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="text-sm tabular-nums w-12 text-right text-[var(--text)]">
          {progress}%
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[var(--border-soft)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {milestones.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-2">
            Milestones · {completedMilestones.length} / {milestones.length}
          </div>
          <ul className="space-y-1.5">
            {milestones.map((m, i) => {
              const done = completedMilestones.includes(m);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggleMilestone(m)}
                    disabled={pending}
                    className="flex items-center gap-2.5 text-sm w-full text-left rounded-md px-1.5 py-1 hover:bg-[var(--bg-card-hover)] transition"
                  >
                    <span
                      className={`grid place-items-center w-4 h-4 rounded border ${
                        done
                          ? "bg-[var(--accent)] border-[var(--accent)] text-zinc-950"
                          : "border-[var(--border-strong)]"
                      }`}
                    >
                      {done && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span
                      className={
                        done
                          ? "line-through text-[var(--text-faint)]"
                          : "text-[var(--text-muted)]"
                      }
                    >
                      {m}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- Bookmark reading state ----------

const READING_STATES = [
  { value: "to-read", label: "To read" },
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
] as const;

export function BookmarkStateEditor({
  id,
  metadata,
}: {
  id: string;
  metadata: Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<string>(
    (metadata.readState as string | undefined) ?? "to-read",
  );

  function set(value: string) {
    setState(value);
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metadata: { ...metadata, readState: value },
        }),
      });
      if (!res.ok) {
        toast.error("Couldn't update");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-10 life-card p-5">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
        Reading state
      </h3>
      <div className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-rail)] p-0.5">
        {READING_STATES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => set(s.value)}
            disabled={pending}
            className={`text-xs px-3 py-1.5 rounded transition ${
              state === s.value
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
