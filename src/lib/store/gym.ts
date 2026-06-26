"use client";

/**
 * Gym store: live queries + CRUD over the `exercises`, `workouts` and
 * `routines` Dexie tables, plus one-time seeding of the starter library.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type {
  Equipment,
  Exercise,
  ExerciseType,
  MuscleGroup,
  Routine,
  RoutineItem,
  Workout,
  WorkoutEntry,
} from "@/lib/gym/types";
import { SEED_EXERCISES, SEED_ROUTINES } from "@/lib/gym/seed";

const SEED_FLAG = "gym.seeded";

/** Seed the library + preset routines once. No-ops after the first run. */
export async function seedGymIfNeeded(): Promise<void> {
  try {
    const flag = await db.appKV.get(SEED_FLAG);
    if (flag?.value) return;
    if ((await db.exercises.count()) === 0) {
      const now = new Date();
      await db.exercises.bulkAdd(
        SEED_EXERCISES.map((e) => ({ ...e, custom: false, createdAt: now })),
      );
      await db.routines.bulkAdd(
        SEED_ROUTINES.map((r) => ({
          id: r.id,
          name: r.name,
          focus: r.focus,
          note: r.note,
          items: r.items,
          preset: true,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
    await db.appKV.put({ key: SEED_FLAG, value: true });
  } catch {
    /* seeding is best-effort */
  }
}

// ── live queries ──────────────────────────────────────────────────────────────

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(() => db.exercises.orderBy("name").toArray(), []);
}

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(
    () => db.workouts.orderBy("date").reverse().toArray(),
    [],
  );
}

export function useRoutines(): Routine[] | undefined {
  return useLiveQuery(() => db.routines.orderBy("name").toArray(), []);
}

// ── exercises ───────────────────────────────────────────────────────────────

export async function addExercise(input: {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  type: ExerciseType;
}): Promise<string> {
  const id = `cust-${crypto.randomUUID()}`;
  await db.exercises.add({ ...input, id, custom: true, createdAt: new Date() });
  return id;
}

export async function deleteExercise(id: string): Promise<void> {
  await db.exercises.delete(id);
}

// ── workouts ────────────────────────────────────────────────────────────────

export async function addWorkout(
  w: Omit<Workout, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.workouts.add({ ...w, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateWorkout(
  id: string,
  patch: Partial<Omit<Workout, "id" | "createdAt">>,
): Promise<void> {
  await db.workouts.update(id, { ...patch, updatedAt: new Date() });
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.workouts.delete(id);
}

/** Fast path: set the focus for a day, creating an empty workout if none exists. */
export async function upsertDayFocus(
  date: string,
  focus: string | null,
): Promise<void> {
  const existing = await db.workouts.where("date").equals(date).first();
  if (existing) {
    await db.workouts.update(existing.id, { focus, updatedAt: new Date() });
    return;
  }
  const now = new Date();
  await db.workouts.add({
    id: crypto.randomUUID(),
    date,
    focus,
    entries: [],
    createdAt: now,
    updatedAt: now,
  });
}

// ── routines ────────────────────────────────────────────────────────────────

export async function addRoutine(input: {
  name: string;
  focus: string | null;
  note?: string;
  items: RoutineItem[];
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.routines.add({
    ...input,
    id,
    preset: false,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateRoutine(
  id: string,
  patch: Partial<Omit<Routine, "id" | "createdAt" | "preset">>,
): Promise<void> {
  await db.routines.update(id, { ...patch, updatedAt: new Date() });
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id);
}

/** Turn a routine's planned items into empty workout entries to log against. */
export function routineToEntries(items: RoutineItem[]): WorkoutEntry[] {
  return items.map((it) => ({
    exerciseId: it.exerciseId,
    name: it.name,
    muscle: it.muscle,
    type: "strength" as ExerciseType,
    sets: Array.from({ length: it.targetSets ?? 3 }, () => ({
      reps: it.targetReps,
    })),
  }));
}
