"use client";

import { useEffect, useState, useTransition } from "react";
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

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") reset();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

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
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        Add goal
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh] bg-black/40 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] p-6 life-rise"
        style={{ boxShadow: "var(--shadow-3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold mb-4 text-[var(--ink)]">
          <Target
            size={15}
            strokeWidth={1.6}
            className="text-[var(--terra)]"
          />
          New goal
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you aiming at?"
          autoFocus
          className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Why does this matter? What's the success metric?"
          className="mt-2 w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] resize-none transition"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
              Target date
            </span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-2.5 py-2 text-[13.5px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
              Starting progress
            </span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="flex-1 accent-[var(--terra)]"
              />
              <span className="font-mono text-[12px] text-[var(--ink)] tabular-nums w-9 text-right">
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
