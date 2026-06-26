"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X, Play, Pencil, Trash2, Repeat } from "lucide-react";
import { Portal } from "@/components/portal";
import {
  addRoutine,
  updateRoutine,
  deleteRoutine,
} from "@/lib/store/gym";
import {
  FOCUS_PRESETS,
  focusColor,
  MUSCLE_LABEL,
  type Exercise,
  type Routine,
  type RoutineItem,
} from "@/lib/gym/types";
import { ExercisePicker } from "./exercise-picker";
import { EmptyState } from "./ui";

type Editing = { routine?: Routine } | null;

export function RoutinesTab({
  routines,
  exercises,
  onStart,
}: {
  routines: Routine[] | undefined;
  exercises: Exercise[] | undefined;
  onStart: (r: Routine) => void;
}) {
  const [editing, setEditing] = useState<Editing>(null);

  if (routines === undefined) {
    return (
      <div className="grid sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[120px] rounded-[12px] bg-[var(--bg-2)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[var(--muted)]">
          Start a workout from a template, or build your own.
        </p>
        <button
          type="button"
          onClick={() => setEditing({})}
          className="life-btn life-btn-sm life-btn-primary"
        >
          <Plus size={13} strokeWidth={2} />
          New routine
        </button>
      </div>

      {routines.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No routines."
          body="Build a reusable template — pick exercises and target sets/reps — then start a workout from it in one tap."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {routines.map((r) => (
            <div key={r.id} className="life-card p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold text-[var(--ink)] truncate">
                    {r.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {r.focus && (
                      <span
                        className="text-[10px] font-semibold rounded-[6px] px-1.5 py-0.5"
                        style={{
                          color: focusColor(r.focus),
                          background: `color-mix(in oklch, ${focusColor(r.focus)} 15%, transparent)`,
                        }}
                      >
                        {r.focus}
                      </span>
                    )}
                    <span className="text-[11px] text-[var(--muted)]">
                      {r.items.length} exercises
                    </span>
                  </div>
                </div>
                {!r.preset && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditing({ routine: r })}
                      aria-label="Edit"
                      className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--ink)] transition"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${r.name}"?`)) void deleteRoutine(r.id);
                      }}
                      aria-label="Delete"
                      className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--bad)] transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              <ul className="mt-3 space-y-0.5 flex-1">
                {r.items.slice(0, 5).map((it, i) => (
                  <li
                    key={i}
                    className="text-[12px] text-[var(--ink-2)] flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{it.name}</span>
                    <span className="text-[var(--muted)] tabular-nums shrink-0">
                      {it.targetSets ?? "—"}×{it.targetReps ?? "—"}
                    </span>
                  </li>
                ))}
                {r.items.length > 5 && (
                  <li className="text-[11px] text-[var(--muted-2)]">
                    +{r.items.length - 5} more
                  </li>
                )}
              </ul>

              <button
                type="button"
                onClick={() => onStart(r)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-[9px] bg-[var(--terra)] text-white text-[12.5px] font-medium hover:brightness-105 active:translate-y-px transition"
              >
                <Play size={13} />
                Start
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <RoutineForm
          routine={editing.routine}
          exercises={exercises ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function RoutineForm({
  routine,
  exercises,
  onClose,
}: {
  routine?: Routine;
  exercises: Exercise[];
  onClose: () => void;
}) {
  const [name, setName] = useState(routine?.name ?? "");
  const [focus, setFocus] = useState<string | null>(routine?.focus ?? null);
  const [items, setItems] = useState<RoutineItem[]>(routine?.items ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addItem(ex: Exercise) {
    setItems((xs) => [
      ...xs,
      { exerciseId: ex.id, name: ex.name, muscle: ex.muscle, targetSets: 3, targetReps: 10 },
    ]);
    setPickerOpen(false);
  }
  function patchItem(i: number, patch: Partial<RoutineItem>) {
    setItems((xs) => xs.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name your routine");
      return;
    }
    try {
      if (routine) {
        await updateRoutine(routine.id, { name: name.trim(), focus, items });
      } else {
        await addRoutine({ name: name.trim(), focus, items });
      }
      toast.success(routine ? "Routine updated" : "Routine saved");
      onClose();
    } catch {
      toast.error("Couldn't save");
    }
  }

  const mini =
    "w-12 rounded-[7px] bg-[var(--paper-2)] border border-[var(--line)] px-1.5 py-1 text-[12.5px] text-center tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--terra)]";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[6vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-[var(--line)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-[var(--ink)]">
                {routine ? "Edit routine" : "New routine"}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                <X size={14} />
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Routine name (e.g. Push day)"
              autoFocus
              className="w-full rounded-[9px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] mb-2.5"
            />
            <div className="flex flex-wrap gap-1.5">
              {FOCUS_PRESETS.map((f) => {
                const on = focus === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFocus(on ? null : f)}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium transition active:scale-[0.97] ${
                      on
                        ? "text-white"
                        : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                    style={on ? { background: focusColor(f) } : undefined}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 space-y-1.5 max-h-[44vh] overflow-y-auto">
            {items.length === 0 && (
              <p className="text-[13px] text-[var(--muted)] text-center py-5">
                Add the exercises this routine should include.
              </p>
            )}
            {items.map((it, i) => (
              <div
                key={`${it.exerciseId}-${i}`}
                className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[var(--ink)] truncate">
                    {it.name}
                  </div>
                  <div className="text-[10.5px] text-[var(--muted)]">
                    {MUSCLE_LABEL[it.muscle]}
                  </div>
                </div>
                <input
                  type="number"
                  value={it.targetSets ?? ""}
                  onChange={(e) =>
                    patchItem(i, {
                      targetSets: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className={mini}
                  aria-label="Target sets"
                />
                <span className="text-[var(--muted-2)] text-[12px]">×</span>
                <input
                  type="number"
                  value={it.targetReps ?? ""}
                  onChange={(e) =>
                    patchItem(i, {
                      targetReps: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className={mini}
                  aria-label="Target reps"
                />
                <button
                  type="button"
                  onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}
                  aria-label="Remove"
                  className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--bad)] transition"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] border border-dashed border-[var(--line-2)] text-[12.5px] font-medium text-[var(--muted)] hover:text-[var(--terra)] hover:border-[var(--terra)] transition"
            >
              <Plus size={15} />
              Add exercise
            </button>
          </div>

          <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-2)] flex items-center justify-end gap-2">
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
              className="life-btn life-btn-sm life-btn-primary"
            >
              {routine ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onPick={addItem}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Portal>
  );
}
