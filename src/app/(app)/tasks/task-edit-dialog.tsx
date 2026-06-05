"use client";

import { useEffect, useState } from "react";
import { Calendar, Repeat, Trash2, X } from "lucide-react";
import type { StoredItem } from "@/lib/store/items";
import { updateItem, deleteItem } from "@/lib/store/items";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { Portal } from "@/components/portal";
import { PrioritySelect } from "@/components/priority-select";

type Priority = "low" | "medium" | "high";
type Recurrence = "" | "daily" | "weekdays" | "weekly" | "monthly";

export function TaskEditDialog({
  task,
  onClose,
}: {
  task: StoredItem;
  onClose: () => void;
}) {
  const meta = (task.metadata ?? {}) as {
    dueDate?: string | null;
    priority?: Priority | null;
    recurrence?: Recurrence | null;
  };

  const [title, setTitle] = useState(task.title ?? "");
  const [priority, setPriority] = useState<Priority>(
    (meta.priority as Priority) ?? "medium",
  );
  const [dueInput, setDueInput] = useState(
    meta.dueDate ? new Date(meta.dueDate).toISOString().slice(0, 10) : "",
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(
    (meta.recurrence as Recurrence) ?? "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parsed = parseNaturalDate(title);
  const cleanTitle = parsed ? parsed.title : title.trim();

  async function save() {
    if (!cleanTitle) return;
    setSaving(true);
    let dueIso: string | null = null;
    if (parsed) {
      dueIso = parsed.date.toISOString();
    } else if (dueInput) {
      const d = new Date(dueInput);
      if (!Number.isNaN(d.getTime())) dueIso = d.toISOString();
    }
    await updateItem(task.id, {
      title: cleanTitle,
      metadata: {
        ...meta,
        priority,
        dueDate: dueIso,
        recurrence: recurrence || null,
      },
    });
    setSaving(false);
    onClose();
  }

  async function remove() {
    if (!confirm("Delete this task?")) return;
    await deleteItem(task.id);
    onClose();
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] overflow-hidden life-rise"
          style={{ boxShadow: "var(--shadow-3)" }}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-soft)]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Edit task
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-faint)] hover:text-[var(--text)] transition"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              }}
              className="mt-1.5 w-full bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] transition"
            />
            {parsed && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
                <Calendar size={10} />
                due {dateLabel(parsed.date)}
                <span className="text-[var(--text-faint)]">· parsed “{parsed.phrase}”</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Priority
            </label>
            <div className="mt-1.5">
              <PrioritySelect value={priority} onChange={setPriority} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Due date
              </label>
              <input
                type="date"
                value={dueInput}
                onChange={(e) => setDueInput(e.target.value)}
                className="mt-1.5 w-full bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Repeat
              </label>
              <div className="relative mt-1.5">
                <Repeat
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none"
                />
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                  className="w-full bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded-md pl-7 pr-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)] transition appearance-none"
                >
                  <option value="">none</option>
                  <option value="daily">daily</option>
                  <option value="weekdays">weekdays</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-soft)] bg-[var(--bg-rail)]">
          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1.5 text-[11px] text-[#ef8b8b] hover:brightness-125 transition"
          >
            <Trash2 size={12} />
            Delete
          </button>
          <div className="flex items-center gap-2">
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
              disabled={saving || !cleanTitle}
              className="life-btn life-btn-sm life-btn-primary"
            >
              Save
            </button>
          </div>
        </footer>
        </div>
      </div>
    </Portal>
  );
}
