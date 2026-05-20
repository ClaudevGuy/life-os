"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Flame } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewHabit() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekdays" | "weekly">("daily");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setSummary("");
    setCadence("daily");
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
          kind: "habit",
          title: title.trim(),
          body: summary.trim() || null,
          metadata: { cadence, checkins: [] },
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Habit added");
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
        New habit
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-6 life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-sm font-medium mb-4">
          <Flame size={14} className="text-[var(--accent)]" />
          New habit
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Habit name (e.g. Morning walk)"
          autoFocus
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Why (optional)"
          className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />

        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-1.5">
            Cadence
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-rail)] p-0.5">
            {(["daily", "weekdays", "weekly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={`text-xs capitalize px-3 py-1 rounded transition ${
                  cadence === c
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
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
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
