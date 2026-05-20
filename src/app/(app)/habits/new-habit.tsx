"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Flame } from "lucide-react";
import { captureItem, updateItem, type StoredItem } from "@/lib/store/items";
import { Portal } from "@/components/portal";

type Cadence = "daily" | "weekdays" | "weekly";

const CADENCES: Cadence[] = ["daily", "weekdays", "weekly"];

export function NewHabit() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New habit
      </button>
    );
  }

  return <HabitFormModal existing={null} onClose={() => setOpen(false)} />;
}

export function HabitFormModal({
  existing,
  onClose,
}: {
  existing: StoredItem | null;
  onClose: () => void;
}) {
  const existingMeta = (existing?.metadata ?? {}) as {
    cadence?: Cadence;
    checkins?: string[];
  };
  const [title, setTitle] = useState(existing?.title ?? "");
  const [summary, setSummary] = useState(existing?.body ?? "");
  const [cadence, setCadence] = useState<Cadence>(existingMeta.cadence ?? "daily");
  const [pending, startTransition] = useTransition();

  // ESC closes the modal — matches keyboard behavior on the other dialogs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!title.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        if (existing) {
          await updateItem(existing.id, {
            title: title.trim(),
            body: summary.trim() || null,
            metadata: { ...existingMeta, cadence },
          });
          toast.success("Updated");
        } else {
          await captureItem({
            kind: "habit",
            title: title.trim(),
            body: summary.trim() || null,
            metadata: { cadence, checkins: [] },
          });
          toast.success("Habit added");
        }
      } catch {
        toast.error("Couldn't save");
        return;
      }
      onClose();
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] p-6 life-rise"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
        <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold mb-4 text-[var(--ink)]">
          <Flame
            size={15}
            strokeWidth={1.6}
            className="text-[var(--terra)]"
          />
          {existing ? "Edit habit" : "New habit"}
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Habit name (e.g. Morning walk)"
          autoFocus
          className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Why (optional)"
          className="mt-2 w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />

        <div className="mt-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
            Cadence
          </div>
          <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)]">
            {CADENCES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadence(c)}
                className={`text-[12.5px] capitalize px-3 py-1 rounded-[7px] font-medium transition ${
                  cadence === c
                    ? "bg-[var(--paper)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
                style={
                  cadence === c ? { boxShadow: "var(--shadow-1)" } : undefined
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
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
            {existing ? "Save" : "Add"}
          </button>
        </div>
        </div>
      </div>
    </Portal>
  );
}
