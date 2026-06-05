"use client";

import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import {
  Calendar,
  Repeat,
  Trash2,
  X,
  AlignLeft,
  ListChecks,
  Check,
  Plus,
} from "lucide-react";
import type { StoredItem } from "@/lib/store/items";
import { updateItem, deleteItem } from "@/lib/store/items";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { Portal } from "@/components/portal";
import { PrioritySelect } from "@/components/priority-select";

type Priority = "low" | "medium" | "high";
type Recurrence = "" | "daily" | "weekdays" | "weekly" | "monthly";
type Subtask = { id: string; text: string; done: boolean };

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
    subtasks?: Subtask[];
  };

  const [title, setTitle] = useState(task.title ?? "");
  const [notes, setNotes] = useState(task.body ?? "");
  const [priority, setPriority] = useState<Priority>(
    (meta.priority as Priority) ?? "medium",
  );
  const [dueInput, setDueInput] = useState(
    meta.dueDate ? new Date(meta.dueDate).toISOString().slice(0, 10) : "",
  );
  const [recurrence, setRecurrence] = useState<Recurrence>(
    (meta.recurrence as Recurrence) ?? "",
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(meta.subtasks ?? []);
  const [subDraft, setSubDraft] = useState("");
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
  const subDone = subtasks.filter((s) => s.done).length;

  function addSubtask() {
    const t = subDraft.trim();
    if (!t) return;
    setSubtasks((prev) => [...prev, { id: nanoid(), text: t, done: false }]);
    setSubDraft("");
  }

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
      body: notes.trim() || null,
      metadata: {
        ...meta,
        priority,
        dueDate: dueIso,
        recurrence: recurrence || null,
        subtasks: subtasks.filter((s) => s.text.trim()),
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
          className="w-full max-w-lg rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] overflow-hidden life-rise flex flex-col max-h-[88vh]"
          style={{ boxShadow: "var(--shadow-3)" }}
        >
          <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[var(--border-soft)]">
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

          <div className="px-5 py-4 space-y-4 overflow-y-auto">
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

            {/* Context / notes */}
            <div>
              <label className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                <AlignLeft size={11} />
                Context
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add context, links, why this matters… (markdown welcome)"
                className="mt-1.5 w-full bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded-md px-3 py-2 text-[13.5px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] resize-y transition"
              />
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

            {/* Subtasks */}
            <div>
              <label className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                <ListChecks size={11} />
                Subtasks
                {subtasks.length > 0 && (
                  <span className="text-[var(--text-faint)] font-mono normal-case tracking-normal">
                    · {subDone}/{subtasks.length} done
                  </span>
                )}
              </label>
              <div className="mt-1.5 space-y-1.5">
                {subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSubtasks((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                        )
                      }
                      aria-label={s.done ? "Mark subtask undone" : "Mark subtask done"}
                      className="grid place-items-center w-[18px] h-[18px] rounded-[5px] shrink-0 transition"
                      style={{
                        border: `1.5px solid ${s.done ? "var(--sage)" : "var(--border-strong)"}`,
                        background: s.done ? "var(--sage)" : "transparent",
                        color: "var(--paper)",
                      }}
                    >
                      {s.done && <Check size={11} strokeWidth={3} />}
                    </button>
                    <input
                      value={s.text}
                      onChange={(e) =>
                        setSubtasks((prev) =>
                          prev.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)),
                        )
                      }
                      className={`flex-1 bg-transparent text-[13.5px] focus:outline-none border-b border-transparent focus:border-[var(--border-soft)] transition ${
                        s.done ? "line-through text-[var(--text-faint)]" : "text-[var(--text)]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== s.id))}
                      aria-label="Remove subtask"
                      className="grid place-items-center w-6 h-6 rounded-md text-[var(--text-faint)] hover:text-[var(--bad)] transition shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Plus size={14} className="text-[var(--text-faint)] shrink-0 ml-0.5" />
                  <input
                    value={subDraft}
                    onChange={(e) => setSubDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                    placeholder="Add a subtask…"
                    className="flex-1 bg-transparent text-[13.5px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none py-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-[var(--border-soft)] bg-[var(--bg-rail)]">
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
