"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewGoal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [targetDate, setTargetDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [progress, setProgress] = useState(0);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setSummary("");
    setProgress(0);
    setOpen(false);
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "goal",
          title: title.trim(),
          body: summary.trim() || null,
          metadata: {
            progress,
            targetDate: new Date(`${targetDate}T09:00:00`).toISOString(),
            milestones: [],
          },
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Goal set");
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-primary"
      >
        <Plus size={12} strokeWidth={3} />
        New goal
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh] bg-black/60 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-6 life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-sm font-medium mb-4">
          <Target size={14} className="text-[var(--accent)]" />
          New goal
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you aiming at?"
          autoFocus
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Why does this matter? What's the success metric?"
          className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-[var(--text-muted)] flex flex-col gap-1.5">
            Target date
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)] flex flex-col gap-1.5">
            Starting progress
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className="text-xs text-[var(--text)] tabular-nums w-9 text-right">
                {progress}%
              </span>
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="life-btn life-btn-sm life-btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="life-btn life-btn-sm life-btn-primary"
          >
            Set goal
          </button>
        </div>
      </div>
    </div>
  );
}
