/**
 * Gym tracker types + shared constants. Pure (no React, no DOM) so the Dexie
 * store in db.ts can import the row shapes directly.
 *
 * Weights are stored in kilograms; the UI converts for kg/lb display via the
 * helpers in lib/store/health.ts (shared with the bodyweight tracking we carry
 * over from the old Health tab).
 */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "core"
  | "cardio"
  | "fullbody"
  | "other";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "cardio"
  | "other";

export type ExerciseType = "strength" | "cardio";

/** A library exercise (seeded or user-added). */
export type Exercise = {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
  custom: boolean;
  createdAt: Date;
};

/** One logged set. Strength uses weightKg/reps/rpe; cardio uses distance/duration. */
export type SetEntry = {
  weightKg?: number;
  reps?: number;
  rpe?: number;
  distanceKm?: number;
  durationSec?: number;
};

/** An exercise within a workout, with its sets. */
export type WorkoutEntry = {
  exerciseId: string;
  name: string;
  muscle: MuscleGroup;
  type: ExerciseType;
  sets: SetEntry[];
};

/** A logged workout session, keyed by id, dated by `date` (YYYY-MM-DD). */
export type Workout = {
  id: string;
  date: string;
  /** Training focuses for the session, e.g. ["Legs", "Shoulders"]. */
  focus: string[];
  title?: string;
  notes?: string;
  entries: WorkoutEntry[];
  createdAt: Date;
  updatedAt: Date;
};

/** A planned exercise inside a routine template. */
export type RoutineItem = {
  exerciseId: string;
  name: string;
  muscle: MuscleGroup;
  targetSets?: number;
  targetReps?: number;
  note?: string;
};

/** A reusable workout template. */
export type Routine = {
  id: string;
  name: string;
  focus: string | null;
  note?: string;
  items: RoutineItem[];
  preset: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ── labels ──────────────────────────────────────────────────────────────────

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "cardio",
  "fullbody",
  "other",
];

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Legs",
  glutes: "Glutes",
  core: "Core",
  cardio: "Cardio",
  fullbody: "Full body",
  other: "Other",
};

export const EQUIPMENTS: Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "cardio",
  "other",
];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  band: "Band",
  cardio: "Cardio",
  other: "Other",
};

// ── focus / split ───────────────────────────────────────────────────────────

/** Preset "what did I train" labels, grouped for tidy pickers. */
export const FOCUS_GROUPS: { label: string; items: string[] }[] = [
  { label: "Splits", items: ["Push", "Pull", "Legs", "Upper", "Lower", "Full body"] },
  { label: "By muscle", items: ["Chest", "Back", "Shoulders", "Arms", "Core", "Cardio"] },
];

/** Flat list of preset focus labels. Custom strings are allowed too. */
export const FOCUS_PRESETS: string[] = FOCUS_GROUPS.flatMap((g) => g.items);

const PALETTE = [
  "var(--terra)",
  "var(--sky)",
  "var(--gold)",
  "var(--sage)",
  "var(--plum)",
] as const;

const FOCUS_COLOR: Record<string, string> = {
  Push: "var(--terra)",
  Pull: "var(--sky)",
  Legs: "var(--gold)",
  Upper: "var(--plum)",
  Lower: "var(--sage)",
  "Full body": "var(--terra)",
  Chest: "var(--terra)",
  Back: "var(--sky)",
  Shoulders: "var(--gold)",
  Arms: "var(--plum)",
  Core: "var(--sage)",
  Cardio: "var(--sky)",
};

/** A stable theme color for any focus label (custom labels hash into the palette). */
export function focusColor(focus: string | null | undefined): string {
  if (!focus) return "var(--muted)";
  const known = FOCUS_COLOR[focus];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < focus.length; i++) h = (h * 31 + focus.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Normalize a workout's focus to an array (tolerates legacy string/null rows). */
export function focusesOf(focus: string[] | string | null | undefined): string[] {
  if (Array.isArray(focus)) return focus;
  return focus ? [focus] : [];
}
