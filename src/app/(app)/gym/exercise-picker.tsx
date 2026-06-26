"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X, Plus, Dumbbell } from "lucide-react";
import { Portal } from "@/components/portal";
import { addExercise } from "@/lib/store/gym";
import {
  EQUIPMENT_LABEL,
  EQUIPMENTS,
  MUSCLE_GROUPS,
  MUSCLE_LABEL,
  type Equipment,
  type Exercise,
  type ExerciseType,
  type MuscleGroup,
} from "@/lib/gym/types";

export function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "all">("all");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      if (muscle !== "all" && e.muscle !== muscle) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, muscle]);

  const presentMuscles = useMemo(
    () => MUSCLE_GROUPS.filter((m) => exercises.some((e) => e.muscle === m)),
    [exercises],
  );

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[130] flex items-start justify-center pt-[6vh] pb-8 px-4 bg-black/55 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden flex flex-col max-h-[82vh]"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 pb-3 border-b border-[var(--line)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-semibold text-[var(--ink)]">
                Add exercise
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
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                autoFocus
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] pl-9 pr-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </div>
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 -mb-1">
              <FilterPill active={muscle === "all"} onClick={() => setMuscle("all")}>
                All
              </FilterPill>
              {presentMuscles.map((m) => (
                <FilterPill
                  key={m}
                  active={muscle === m}
                  onClick={() => setMuscle(m)}
                >
                  {MUSCLE_LABEL[m]}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="text-[13px] text-[var(--muted)] text-center py-8">
                No matches.
              </p>
            ) : (
              filtered.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onPick(ex)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-left hover:bg-[var(--bg-card-hover)] transition"
                >
                  <span className="grid place-items-center w-8 h-8 rounded-[9px] shrink-0 bg-[color-mix(in_oklch,var(--terra)_12%,transparent)] text-[var(--terra)]">
                    <Dumbbell size={14} strokeWidth={1.7} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium text-[var(--ink)] truncate">
                      {ex.name}
                    </span>
                    <span className="block text-[11px] text-[var(--muted)]">
                      {MUSCLE_LABEL[ex.muscle]} · {EQUIPMENT_LABEL[ex.equipment]}
                    </span>
                  </span>
                  <Plus size={15} className="text-[var(--muted-2)] shrink-0" />
                </button>
              ))
            )}
          </div>

          <div className="border-t border-[var(--line)] p-3">
            {creating ? (
              <CustomExercise
                onCancel={() => setCreating(false)}
                onCreated={(ex) => onPick(ex)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[12.5px] font-medium text-[var(--terra)] hover:opacity-80 transition"
              >
                <Plus size={14} />
                Create custom exercise
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function CustomExercise({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (ex: Exercise) => void;
}) {
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
      const id = await addExercise({ name: name.trim(), muscle, equipment, type });
      onCreated({
        id,
        name: name.trim(),
        muscle,
        equipment,
        type,
        custom: true,
        createdAt: new Date(),
      });
    } catch {
      toast.error("Couldn't create");
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        autoFocus
        className="w-full rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)]"
      />
      <div className="flex flex-wrap gap-1.5">
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
          className={selectCls}
        >
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_LABEL[m]}
            </option>
          ))}
        </select>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment)}
          className={selectCls}
        >
          {EQUIPMENTS.map((eq) => (
            <option key={eq} value={eq}>
              {EQUIPMENT_LABEL[eq]}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ExerciseType)}
          className={selectCls}
        >
          <option value="strength">Strength</option>
          <option value="cardio">Cardio</option>
        </select>
      </div>
      <div className="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onCancel}
          className="life-btn life-btn-sm life-btn-ghost"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={create}
          className="life-btn life-btn-sm life-btn-primary"
        >
          Add
        </button>
      </div>
    </div>
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
