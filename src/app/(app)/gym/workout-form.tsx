"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Trash2, Plus, Dumbbell } from "lucide-react";
import { Portal } from "@/components/portal";
import { addWorkout, updateWorkout, deleteWorkout } from "@/lib/store/gym";
import {
  kgToUnit,
  unitToKg,
  type WeightUnit,
} from "@/lib/store/health";
import {
  FOCUS_PRESETS,
  focusColor,
  focusesOf,
  MUSCLE_LABEL,
  type Exercise,
  type SetEntry,
  type Workout,
  type WorkoutEntry,
} from "@/lib/gym/types";
import { entryVolume } from "@/lib/gym/calc";
import { ExercisePicker } from "./exercise-picker";
import { fmtWeight } from "./ui";

export type FormInitial = {
  workout?: Workout;
  date?: string;
  focus?: string[];
  title?: string;
  entries?: WorkoutEntry[];
};

const inputCls =
  "w-full rounded-[9px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition";

export function WorkoutForm({
  initial,
  exercises,
  unit,
  onClose,
}: {
  initial: FormInitial;
  exercises: Exercise[];
  unit: WeightUnit;
  onClose: () => void;
}) {
  const editingId = initial.workout?.id ?? null;
  const [date, setDate] = useState(
    initial.workout?.date ?? initial.date ?? "",
  );
  const [focus, setFocus] = useState<string[]>(
    initial.workout ? focusesOf(initial.workout.focus) : (initial.focus ?? []),
  );
  const [title, setTitle] = useState(
    initial.workout?.title ?? initial.title ?? "",
  );
  const [notes, setNotes] = useState(initial.workout?.notes ?? "");
  const [entries, setEntries] = useState<WorkoutEntry[]>(
    initial.workout?.entries ?? initial.entries ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pickerOpen) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pickerOpen]);

  function patchEntry(i: number, patch: Partial<WorkoutEntry>) {
    setEntries((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  }
  function patchSet(ei: number, si: number, patch: Partial<SetEntry>) {
    setEntries((es) =>
      es.map((e, j) =>
        j === ei
          ? { ...e, sets: e.sets.map((s, k) => (k === si ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  }
  function addSet(ei: number) {
    setEntries((es) =>
      es.map((e, j) => {
        if (j !== ei) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, last ? { ...last } : {}] };
      }),
    );
  }
  function removeSet(ei: number, si: number) {
    setEntries((es) =>
      es.map((e, j) =>
        j === ei ? { ...e, sets: e.sets.filter((_, k) => k !== si) } : e,
      ),
    );
  }
  function removeEntry(ei: number) {
    setEntries((es) => es.filter((_, j) => j !== ei));
  }
  function addExercise(ex: Exercise) {
    setEntries((es) => [
      ...es,
      {
        exerciseId: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        type: ex.type,
        sets: [{}],
      },
    ]);
    setPickerOpen(false);
  }

  async function save() {
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    // Drop fully-empty sets.
    const cleaned: WorkoutEntry[] = entries.map((e) => ({
      ...e,
      sets: e.sets.filter(
        (s) =>
          s.weightKg != null ||
          s.reps != null ||
          s.distanceKm != null ||
          s.durationSec != null,
      ),
    }));
    setSaving(true);
    try {
      const payload = {
        date,
        focus,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
        entries: cleaned,
      };
      if (editingId) await updateWorkout(editingId, payload);
      else await addWorkout(payload);
      toast.success(editingId ? "Workout updated" : "Workout saved");
      onClose();
    } catch {
      toast.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    if (!confirm("Delete this workout? This can't be undone.")) return;
    try {
      await deleteWorkout(editingId);
      toast.success("Deleted");
      onClose();
    } catch {
      toast.error("Couldn't delete");
    }
  }

  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0);
  const totalVol = entries.reduce((v, e) => v + entryVolume(e), 0);
  const customFocus = focus.find((f) => !FOCUS_PRESETS.includes(f)) ?? "";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[5vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-4 border-b border-[var(--line)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {editingId ? "Edit workout" : "Log a workout"}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputCls} w-auto tabular-nums`}
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className={inputCls}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FOCUS_PRESETS.map((f) => {
                const on = focus.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() =>
                      setFocus((prev) =>
                        prev.includes(f)
                          ? prev.filter((x) => x !== f)
                          : [...prev, f],
                      )
                    }
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
              <input
                value={customFocus}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setFocus((prev) => [
                    ...prev.filter((x) => FOCUS_PRESETS.includes(x)),
                    ...(v ? [v] : []),
                  ]);
                }}
                placeholder="Custom…"
                className="w-[88px] rounded-full bg-[var(--paper-2)] border border-[var(--line)] px-3 py-1 text-[11.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)]"
              />
            </div>
          </div>

          {/* Entries */}
          <div className="p-4 space-y-3 max-h-[48vh] overflow-y-auto">
            {entries.length === 0 && (
              <p className="text-[13px] text-[var(--muted)] text-center py-6">
                No exercises yet — add one below, or just pick a focus above to
                log the day.
              </p>
            )}
            {entries.map((e, ei) => (
              <EntryCard
                key={`${e.exerciseId}-${ei}`}
                entry={e}
                unit={unit}
                onPatchSet={(si, p) => patchSet(ei, si, p)}
                onAddSet={() => addSet(ei)}
                onRemoveSet={(si) => removeSet(ei, si)}
                onRemove={() => removeEntry(ei)}
                onTypeToggle={() =>
                  patchEntry(ei, {
                    type: e.type === "strength" ? "cardio" : "strength",
                  })
                }
              />
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

          {/* Notes */}
          <div className="px-4 pb-4">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (how it felt, anything to remember)…"
              className={inputCls}
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-2)] flex items-center justify-between gap-3">
            {editingId ? (
              <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--bad)] transition"
              >
                <Trash2 size={12} />
                Delete
              </button>
            ) : (
              <span className="text-[11.5px] text-[var(--muted)] tabular-nums">
                {entries.length} ex · {totalSets} sets
                {totalVol > 0 && ` · ${Math.round(totalVol).toLocaleString()} kg`}
              </span>
            )}
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
                disabled={saving}
                className="life-btn life-btn-sm life-btn-primary"
              >
                {editingId ? "Save" : "Finish"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </Portal>
  );
}

// ── one exercise + its sets ───────────────────────────────────────────────────

function EntryCard({
  entry,
  unit,
  onPatchSet,
  onAddSet,
  onRemoveSet,
  onRemove,
  onTypeToggle,
}: {
  entry: WorkoutEntry;
  unit: WeightUnit;
  onPatchSet: (si: number, p: Partial<SetEntry>) => void;
  onAddSet: () => void;
  onRemoveSet: (si: number) => void;
  onRemove: () => void;
  onTypeToggle: () => void;
}) {
  const cardio = entry.type === "cardio";
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[var(--line)]">
        <span className="grid place-items-center w-8 h-8 rounded-[9px] shrink-0 bg-[color-mix(in_oklch,var(--terra)_12%,transparent)] text-[var(--terra)]">
          <Dumbbell size={15} strokeWidth={1.7} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium text-[var(--ink)] truncate">
            {entry.name}
          </div>
          <button
            type="button"
            onClick={onTypeToggle}
            className="text-[10.5px] text-[var(--muted)] hover:text-[var(--terra)] transition"
            title="Toggle strength / cardio"
          >
            {MUSCLE_LABEL[entry.muscle]} · {cardio ? "Cardio" : "Strength"}
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove exercise"
          className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--bad)] transition"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-2.5">
        {cardio ? (
          <div className="flex items-center gap-2 px-1 py-1">
            <NumCell
              value={
                entry.sets[0]?.durationSec != null
                  ? Math.round(entry.sets[0].durationSec / 60)
                  : undefined
              }
              onChange={(v) =>
                onPatchSet(0, { durationSec: v != null ? v * 60 : undefined })
              }
              suffix="min"
            />
            <NumCell
              value={entry.sets[0]?.distanceKm}
              onChange={(v) => onPatchSet(0, { distanceKm: v })}
              suffix="km"
              decimal
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[28px_1fr_1fr_1fr_28px] items-center gap-1.5 px-1 mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--muted-2)] font-semibold">
              <span>Set</span>
              <span>{unit}</span>
              <span>reps</span>
              <span>rpe</span>
              <span />
            </div>
            <div className="space-y-1">
              {entry.sets.map((s, si) => (
                <div
                  key={si}
                  className="grid grid-cols-[28px_1fr_1fr_1fr_28px] items-center gap-1.5"
                >
                  <span className="text-[12px] tabular-nums text-[var(--muted)] text-center font-mono">
                    {si + 1}
                  </span>
                  <WeightCell
                    kg={s.weightKg}
                    unit={unit}
                    onChange={(kg) => onPatchSet(si, { weightKg: kg })}
                  />
                  <NumCell
                    value={s.reps}
                    onChange={(v) => onPatchSet(si, { reps: v })}
                  />
                  <NumCell
                    value={s.rpe}
                    onChange={(v) => onPatchSet(si, { rpe: v })}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveSet(si)}
                    aria-label="Remove set"
                    className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--bad)] transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onAddSet}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--muted)] hover:text-[var(--terra)] transition px-1"
            >
              <Plus size={13} />
              Add set
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── controlled numeric cells (own a text buffer to avoid jitter) ──────────────

function cellCls(extra = "") {
  return `w-full rounded-[7px] bg-[var(--paper-2)] border border-[var(--line)] px-2 py-1.5 text-[13px] text-[var(--ink)] text-center tabular-nums font-mono placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition ${extra}`;
}

function NumCell({
  value,
  onChange,
  suffix,
  decimal,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  decimal?: boolean;
}) {
  const [text, setText] = useState(value != null ? String(value) : "");
  return (
    <div className="relative">
      <input
        inputMode={decimal ? "decimal" : "numeric"}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (!v.trim()) return onChange(undefined);
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) onChange(decimal ? n : Math.round(n));
        }}
        placeholder="—"
        className={cellCls(suffix ? "pr-7" : "")}
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-2)] pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function WeightCell({
  kg,
  unit,
  onChange,
}: {
  kg: number | undefined;
  unit: WeightUnit;
  onChange: (kg: number | undefined) => void;
}) {
  const [text, setText] = useState(
    kg != null ? String(Math.round(kgToUnit(kg, unit) * 10) / 10) : "",
  );
  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (!v.trim()) return onChange(undefined);
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) onChange(unitToKg(n, unit));
      }}
      placeholder="—"
      className={cellCls()}
    />
  );
}
