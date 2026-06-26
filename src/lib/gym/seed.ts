/**
 * Seed data for a fresh gym: a starter exercise library + preset routines.
 * Exercise ids are stable slugs so routines reference them and logged history
 * survives across sessions. Pure data — the store turns these into rows.
 */
import type {
  Equipment,
  ExerciseType,
  MuscleGroup,
  RoutineItem,
} from "./types";

export type SeedExercise = {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
};

export const SEED_EXERCISES: SeedExercise[] = [
  // chest
  { id: "bench-press", name: "Barbell Bench Press", muscle: "chest", equipment: "barbell", type: "strength" },
  { id: "incline-bench-press", name: "Incline Barbell Press", muscle: "chest", equipment: "barbell", type: "strength" },
  { id: "db-bench-press", name: "Dumbbell Bench Press", muscle: "chest", equipment: "dumbbell", type: "strength" },
  { id: "incline-db-press", name: "Incline Dumbbell Press", muscle: "chest", equipment: "dumbbell", type: "strength" },
  { id: "machine-chest-fly", name: "Machine Chest Fly", muscle: "chest", equipment: "machine", type: "strength" },
  { id: "cable-crossover", name: "Cable Crossover", muscle: "chest", equipment: "cable", type: "strength" },
  { id: "push-up", name: "Push-up", muscle: "chest", equipment: "bodyweight", type: "strength" },
  { id: "dips", name: "Dips", muscle: "chest", equipment: "bodyweight", type: "strength" },
  // back
  { id: "deadlift", name: "Deadlift", muscle: "back", equipment: "barbell", type: "strength" },
  { id: "barbell-row", name: "Barbell Row", muscle: "back", equipment: "barbell", type: "strength" },
  { id: "pull-up", name: "Pull-up", muscle: "back", equipment: "bodyweight", type: "strength" },
  { id: "lat-pulldown", name: "Lat Pulldown", muscle: "back", equipment: "cable", type: "strength" },
  { id: "seated-cable-row", name: "Seated Cable Row", muscle: "back", equipment: "cable", type: "strength" },
  { id: "db-row", name: "Dumbbell Row", muscle: "back", equipment: "dumbbell", type: "strength" },
  { id: "t-bar-row", name: "T-Bar Row", muscle: "back", equipment: "machine", type: "strength" },
  // shoulders
  { id: "overhead-press", name: "Overhead Press", muscle: "shoulders", equipment: "barbell", type: "strength" },
  { id: "db-shoulder-press", name: "Dumbbell Shoulder Press", muscle: "shoulders", equipment: "dumbbell", type: "strength" },
  { id: "lateral-raise", name: "Lateral Raise", muscle: "shoulders", equipment: "dumbbell", type: "strength" },
  { id: "front-raise", name: "Front Raise", muscle: "shoulders", equipment: "dumbbell", type: "strength" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", muscle: "shoulders", equipment: "dumbbell", type: "strength" },
  { id: "arnold-press", name: "Arnold Press", muscle: "shoulders", equipment: "dumbbell", type: "strength" },
  { id: "face-pull", name: "Face Pull", muscle: "shoulders", equipment: "cable", type: "strength" },
  { id: "upright-row", name: "Upright Row", muscle: "shoulders", equipment: "barbell", type: "strength" },
  // biceps
  { id: "barbell-curl", name: "Barbell Curl", muscle: "biceps", equipment: "barbell", type: "strength" },
  { id: "db-curl", name: "Dumbbell Curl", muscle: "biceps", equipment: "dumbbell", type: "strength" },
  { id: "hammer-curl", name: "Hammer Curl", muscle: "biceps", equipment: "dumbbell", type: "strength" },
  { id: "preacher-curl", name: "Preacher Curl", muscle: "biceps", equipment: "machine", type: "strength" },
  { id: "cable-curl", name: "Cable Curl", muscle: "biceps", equipment: "cable", type: "strength" },
  // triceps
  { id: "tricep-pushdown", name: "Tricep Pushdown", muscle: "triceps", equipment: "cable", type: "strength" },
  { id: "skullcrusher", name: "Skullcrusher", muscle: "triceps", equipment: "barbell", type: "strength" },
  { id: "overhead-tricep-ext", name: "Overhead Tricep Extension", muscle: "triceps", equipment: "dumbbell", type: "strength" },
  { id: "close-grip-bench", name: "Close-Grip Bench Press", muscle: "triceps", equipment: "barbell", type: "strength" },
  { id: "tricep-dip", name: "Tricep Dip", muscle: "triceps", equipment: "bodyweight", type: "strength" },
  // legs
  { id: "back-squat", name: "Back Squat", muscle: "legs", equipment: "barbell", type: "strength" },
  { id: "front-squat", name: "Front Squat", muscle: "legs", equipment: "barbell", type: "strength" },
  { id: "leg-press", name: "Leg Press", muscle: "legs", equipment: "machine", type: "strength" },
  { id: "romanian-deadlift", name: "Romanian Deadlift", muscle: "legs", equipment: "barbell", type: "strength" },
  { id: "leg-extension", name: "Leg Extension", muscle: "legs", equipment: "machine", type: "strength" },
  { id: "leg-curl", name: "Leg Curl", muscle: "legs", equipment: "machine", type: "strength" },
  { id: "walking-lunge", name: "Walking Lunge", muscle: "legs", equipment: "dumbbell", type: "strength" },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", muscle: "legs", equipment: "dumbbell", type: "strength" },
  { id: "calf-raise", name: "Calf Raise", muscle: "legs", equipment: "machine", type: "strength" },
  { id: "hack-squat", name: "Hack Squat", muscle: "legs", equipment: "machine", type: "strength" },
  // glutes
  { id: "hip-thrust", name: "Hip Thrust", muscle: "glutes", equipment: "barbell", type: "strength" },
  { id: "glute-bridge", name: "Glute Bridge", muscle: "glutes", equipment: "bodyweight", type: "strength" },
  { id: "cable-kickback", name: "Cable Kickback", muscle: "glutes", equipment: "cable", type: "strength" },
  // core
  { id: "plank", name: "Plank", muscle: "core", equipment: "bodyweight", type: "strength" },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", muscle: "core", equipment: "bodyweight", type: "strength" },
  { id: "cable-crunch", name: "Cable Crunch", muscle: "core", equipment: "cable", type: "strength" },
  { id: "ab-wheel", name: "Ab Wheel", muscle: "core", equipment: "other", type: "strength" },
  { id: "russian-twist", name: "Russian Twist", muscle: "core", equipment: "bodyweight", type: "strength" },
  // cardio
  { id: "running", name: "Running", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "cycling", name: "Cycling", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "rowing", name: "Rowing", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "elliptical", name: "Elliptical", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "stair-climber", name: "Stair Climber", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "jump-rope", name: "Jump Rope", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "swimming", name: "Swimming", muscle: "cardio", equipment: "cardio", type: "cardio" },
  { id: "walking", name: "Walking", muscle: "cardio", equipment: "cardio", type: "cardio" },
];

const BY_ID = new Map(SEED_EXERCISES.map((e) => [e.id, e]));

function ri(id: string, targetSets: number, targetReps: number): RoutineItem {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`seed routine references unknown exercise ${id}`);
  return { exerciseId: e.id, name: e.name, muscle: e.muscle, targetSets, targetReps };
}

export type SeedRoutine = {
  id: string;
  name: string;
  focus: string;
  note: string;
  items: RoutineItem[];
};

export const SEED_ROUTINES: SeedRoutine[] = [
  {
    id: "routine-push",
    name: "Push day",
    focus: "Push",
    note: "Chest, shoulders & triceps.",
    items: [
      ri("bench-press", 4, 8),
      ri("overhead-press", 3, 8),
      ri("incline-db-press", 3, 10),
      ri("lateral-raise", 3, 15),
      ri("tricep-pushdown", 3, 12),
    ],
  },
  {
    id: "routine-pull",
    name: "Pull day",
    focus: "Pull",
    note: "Back & biceps.",
    items: [
      ri("deadlift", 3, 5),
      ri("pull-up", 4, 8),
      ri("barbell-row", 3, 8),
      ri("face-pull", 3, 15),
      ri("barbell-curl", 3, 10),
    ],
  },
  {
    id: "routine-legs",
    name: "Leg day",
    focus: "Legs",
    note: "Quads, hamstrings & calves.",
    items: [
      ri("back-squat", 4, 6),
      ri("romanian-deadlift", 3, 8),
      ri("leg-press", 3, 12),
      ri("leg-curl", 3, 12),
      ri("calf-raise", 4, 15),
    ],
  },
  {
    id: "routine-upper",
    name: "Upper body",
    focus: "Upper",
    note: "Chest, back, shoulders & arms.",
    items: [
      ri("bench-press", 4, 8),
      ri("barbell-row", 4, 8),
      ri("overhead-press", 3, 10),
      ri("lat-pulldown", 3, 10),
      ri("barbell-curl", 3, 12),
      ri("tricep-pushdown", 3, 12),
    ],
  },
  {
    id: "routine-lower",
    name: "Lower body",
    focus: "Lower",
    note: "Legs & glutes.",
    items: [
      ri("back-squat", 4, 6),
      ri("romanian-deadlift", 3, 8),
      ri("leg-press", 3, 12),
      ri("hip-thrust", 3, 10),
      ri("calf-raise", 4, 15),
    ],
  },
  {
    id: "routine-fullbody-5x5",
    name: "Full body 5×5",
    focus: "Full body",
    note: "Three big lifts, 5 sets of 5.",
    items: [
      ri("back-squat", 5, 5),
      ri("bench-press", 5, 5),
      ri("barbell-row", 5, 5),
    ],
  },
];
