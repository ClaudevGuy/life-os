"use client";

import { useEffect, useState } from "react";
import {
  Dumbbell,
  ClipboardList,
  Repeat,
  ListChecks,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import {
  useExercises,
  useWorkouts,
  useRoutines,
  seedGymIfNeeded,
  routineToEntries,
} from "@/lib/store/gym";
import type { WeightUnit } from "@/lib/store/health";
import type { Routine, Workout } from "@/lib/gym/types";
import { ymd } from "@/lib/ymd";
import { LogTab } from "./log-tab";
import { RoutinesTab } from "./routines-tab";
import { LibraryTab } from "./library-tab";
import { StatsTab } from "./stats-tab";
import { WorkoutForm, type FormInitial } from "./workout-form";

const UNIT_KEY = "lifeos.gym.unit";

type Tab = "log" | "routines" | "library" | "stats";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "log", label: "Log", icon: ClipboardList },
  { id: "routines", label: "Routines", icon: Repeat },
  { id: "library", label: "Library", icon: ListChecks },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

export default function GymPage() {
  const [tab, setTab] = useState<Tab>("log");
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [form, setForm] = useState<FormInitial | null>(null);

  const exercises = useExercises();
  const workouts = useWorkouts();
  const routines = useRoutines();

  useEffect(() => {
    void seedGymIfNeeded();
    try {
      const u = localStorage.getItem(UNIT_KEY);
      if (u === "kg" || u === "lb") setUnit(u);
    } catch {
      /* ignore */
    }
  }, []);

  function changeUnit(u: WeightUnit) {
    setUnit(u);
    try {
      localStorage.setItem(UNIT_KEY, u);
    } catch {
      /* ignore */
    }
  }

  const today = ymd(new Date());
  const openNew = (date: string = today) => setForm({ date });
  const openEdit = (w: Workout) => setForm({ workout: w });
  const openFromRoutine = (r: Routine) =>
    setForm({
      date: today,
      focus: r.focus,
      title: r.name,
      entries: routineToEntries(r.items),
    });

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto pg-enter space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Dumbbell size={20} strokeWidth={1.7} className="text-[var(--terra)]" />
            Gym
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Log your training, track your lifts, watch your numbers climb.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
          {(["kg", "lb"] as WeightUnit[]).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => changeUnit(u)}
              className={`px-2.5 py-1 rounded-full text-[12px] font-medium uppercase tracking-wide transition ${
                unit === u
                  ? "bg-[var(--paper)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[12px] bg-[var(--paper-2)] border border-[var(--line)]">
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[12.5px] font-medium transition active:scale-[0.98] ${
                on
                  ? "bg-[var(--paper)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <t.icon size={14} strokeWidth={1.8} />
              <span className="hidden xs:inline sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "log" && (
        <LogTab
          workouts={workouts}
          unit={unit}
          onNew={openNew}
          onEdit={openEdit}
        />
      )}
      {tab === "routines" && (
        <RoutinesTab
          routines={routines}
          exercises={exercises}
          onStart={openFromRoutine}
        />
      )}
      {tab === "library" && (
        <LibraryTab
          exercises={exercises}
          workouts={workouts}
          unit={unit}
        />
      )}
      {tab === "stats" && <StatsTab workouts={workouts} unit={unit} />}

      {form && (
        <WorkoutForm
          initial={form}
          exercises={exercises ?? []}
          unit={unit}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
