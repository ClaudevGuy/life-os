"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Dumbbell, X, Trash2 } from "lucide-react";
import { Portal } from "@/components/portal";
import { addExercise, deleteExercise } from "@/lib/store/gym";
import type { WeightUnit } from "@/lib/store/health";
import {
  EQUIPMENT_LABEL,
  EQUIPMENTS,
  MUSCLE_GROUPS,
  MUSCLE_LABEL,
  type Equipment,
  type Exercise,
  type ExerciseType,
  type MuscleGroup,
  type Workout,
} from "@/lib/gym/types";
import { exerciseHistory } from "@/lib/gym/calc";
import { fmtWeight } from "./ui";

export function LibraryTab({
  exercises,
  workouts,
  unit,
}: {
  exercises: Exercise[] | undefined;
  workouts: Workout[] | undefined;
  unit: WeightUnit;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exercises ?? []).filter((e) => {
      if (muscle !== "all" && e.muscle !== muscle) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, muscle]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="w-full rounded-[10px] bg-[var(--paper)] border border-[var(--line)] pl-9 pr-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="life-btn life-btn-sm life-btn-primary shrink-0"
        >
          <Plus size={13} strokeWidth={2} />
          New
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
        <FilterPill active={muscle === "all"} onClick={() => setMuscle("all")}>
          All
        </FilterPill>
        {MUSCLE_GROUPS.map((m) => (
          <FilterPill key={m} active={muscle === m} onClick={() => setMuscle(m)}>
            {MUSCLE_LABEL[m]}
          </FilterPill>
        ))}
      </div>

      {exercises === undefined ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-[60px] rounded-[12px] bg-[var(--bg-2)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setDetail(ex)}
              className="life-card p-3 flex items-center gap-2.5 text-left hover:border-[var(--terra)]/40 transition"
            >
              <span className="grid place-items-center w-9 h-9 rounded-[10px] shrink-0 bg-[color-mix(in_oklch,var(--terra)_12%,transparent)] text-[var(--terra)]">
                <Dumbbell size={16} strokeWidth={1.7} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[var(--ink)] truncate">
                  {ex.name}
                </span>
                <span className="block text-[10.5px] text-[var(--muted)]">
                  {MUSCLE_LABEL[ex.muscle]} · {EQUIPMENT_LABEL[ex.equipment]}
                  {ex.custom && " · custom"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <ExerciseDetail
          exercise={detail}
          workouts={workouts ?? []}
          unit={unit}
          onClose={() => setDetail(null)}
        />
      )}
      {creating && <CreateExercise onClose={() => setCreating(false)} />}
    </div>
  );
}

function ExerciseDetail({
  exercise,
  workouts,
  unit,
  onClose,
}: {
  exercise: Exercise;
  workouts: Workout[];
  unit: WeightUnit;
  onClose: () => void;
}) {
  const history = useMemo(
    () => exerciseHistory(workouts, exercise.id),
    [workouts, exercise.id],
  );
  const bestE = history.reduce((m, h) => Math.max(m, h.bestE1RM), 0);
  const topWeight = history.reduce((m, h) => Math.max(m, h.topWeightKg), 0);
  const maxBar = bestE || 1;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[7vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 p-4 border-b border-[var(--line)]">
            <span className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0 bg-[color-mix(in_oklch,var(--terra)_12%,transparent)] text-[var(--terra)]">
              <Dumbbell size={18} strokeWidth={1.7} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] font-semibold text-[var(--ink)] truncate">
                {exercise.name}
              </div>
              <div className="text-[11.5px] text-[var(--muted)]">
                {MUSCLE_LABEL[exercise.muscle]} · {EQUIPMENT_LABEL[exercise.equipment]}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-md text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Mini label="Best 1RM" value={bestE > 0 ? `${fmtWeight(bestE, unit)}` : "—"} unit={bestE > 0 ? unit : ""} />
              <Mini label="Top weight" value={topWeight > 0 ? `${fmtWeight(topWeight, unit)}` : "—"} unit={topWeight > 0 ? unit : ""} />
              <Mini label="Sessions" value={String(history.length)} />
            </div>

            {history.length >= 2 && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.13em] font-semibold text-[var(--muted)] mb-2">
                  Estimated 1RM
                </div>
                <div className="flex items-end justify-between gap-1 h-16">
                  {history.slice(-16).map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-[3px] transition-all"
                      style={{
                        height: `${Math.max(4, (h.bestE1RM / maxBar) * 100)}%`,
                        background: "var(--terra)",
                        opacity: h.bestE1RM > 0 ? 1 : 0.3,
                      }}
                      title={`${h.date} · ${fmtWeight(h.bestE1RM, unit)} ${unit}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] uppercase tracking-[0.13em] font-semibold text-[var(--muted)] mb-2">
                History
              </div>
              {history.length === 0 ? (
                <p className="text-[12.5px] text-[var(--muted)]">
                  Not logged yet. It&apos;ll show your progress here once you do.
                </p>
              ) : (
                <ul className="space-y-1 max-h-[28vh] overflow-y-auto">
                  {[...history].reverse().map((h, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-[12.5px] py-1 border-b border-[var(--line)] last:border-0"
                    >
                      <span className="text-[var(--muted)] tabular-nums">
                        {new Date(`${h.date}T12:00:00`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-[var(--ink)] tabular-nums">
                        {h.sets} sets
                        {h.topWeightKg > 0 && ` · ${fmtWeight(h.topWeightKg, unit)} ${unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {exercise.custom && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete "${exercise.name}" from your library?`)) {
                    void deleteExercise(exercise.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--bad)] transition"
              >
                <Trash2 size={12} />
                Delete exercise
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-[10px] bg-[var(--paper-2)] p-2.5 text-center">
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--muted)] font-semibold">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums text-[var(--ink)]">
        {value}
        {unit && <span className="text-[10px] text-[var(--muted)] ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function CreateExercise({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const [type, setType] = useState<ExerciseType>("strength");

  const selectCls =
    "rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-2 py-1.5 text-[12.5px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)]";

  async function create() {
    if (!name.trim()) {
      toast.error("Name it");
      return;
    }
    try {
      await addExercise({ name: name.trim(), muscle, equipment, type });
      toast.success("Added to library");
      onClose();
    } catch {
      toast.error("Couldn't add");
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] pb-8 px-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise p-4"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-[var(--ink)]">
              New exercise
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
            placeholder="Exercise name"
            autoFocus
            className="w-full rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] mb-2.5"
          />
          <div className="flex flex-wrap gap-1.5 mb-3">
            <select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup)} className={selectCls}>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>{MUSCLE_LABEL[m]}</option>
              ))}
            </select>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)} className={selectCls}>
              {EQUIPMENTS.map((eq) => (
                <option key={eq} value={eq}>{EQUIPMENT_LABEL[eq]}</option>
              ))}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)} className={selectCls}>
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="life-btn life-btn-sm life-btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={create} className="life-btn life-btn-sm life-btn-primary">
              Add
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap transition shrink-0 ${
        active
          ? "bg-[var(--terra)] text-white"
          : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
