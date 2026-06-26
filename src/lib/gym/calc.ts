/**
 * Pure gym math — estimated 1RM, volume, personal records, weekly streak,
 * muscle/split balance. No React, no DOM, no storage: easy to unit-test.
 */
import { ymd } from "@/lib/ymd";
import type { MuscleGroup, SetEntry, Workout, WorkoutEntry } from "./types";

/** Epley estimated 1-rep max. Single reps return the weight itself. */
export function epley1RM(weightKg: number, reps: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return 0;
  if (!Number.isFinite(reps) || reps <= 1) return Math.max(0, weightKg);
  return weightKg * (1 + reps / 30);
}

export function setVolume(s: SetEntry): number {
  if (typeof s.weightKg === "number" && typeof s.reps === "number") {
    return Math.max(0, s.weightKg) * Math.max(0, s.reps);
  }
  return 0;
}

export function setE1RM(s: SetEntry): number {
  if (typeof s.weightKg === "number" && typeof s.reps === "number") {
    return epley1RM(s.weightKg, s.reps);
  }
  return 0;
}

export function entryVolume(e: WorkoutEntry): number {
  return e.sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export function workoutVolume(w: Workout): number {
  return w.entries.reduce((sum, e) => sum + entryVolume(e), 0);
}

export function workoutSetCount(w: Workout): number {
  return w.entries.reduce((sum, e) => sum + e.sets.length, 0);
}

// ── time windows ─────────────────────────────────────────────────────────────

/** The 7 local YYYY-MM-DD strings of the week `weeksAgo` weeks before `now`. */
function weekYmds(now: Date, weeksAgo: number): string[] {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - weeksAgo * 7);
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return ymd(d);
  });
}

function inLastDays(dateYmd: string, days: number, now: Date): boolean {
  const start = ymd(new Date(now.getTime() - (days - 1) * 86_400_000));
  return dateYmd >= start && dateYmd <= ymd(now);
}

export function thisWeekCount(workouts: Workout[], now: Date = new Date()): number {
  const week = new Set(weekYmds(now, 0));
  return workouts.filter((w) => week.has(w.date)).length;
}

/** Consecutive weeks (ending this week) with at least one workout. */
export function streakWeeks(workouts: Workout[], now: Date = new Date()): number {
  const dates = new Set(workouts.map((w) => w.date));
  let streak = 0;
  for (let w = 0; w < 104; w++) {
    const has = weekYmds(now, w).some((d) => dates.has(d));
    if (has) streak++;
    else if (w === 0) continue; // an empty current week doesn't break the run
    else break;
  }
  return streak;
}

export function volumeInPeriod(
  workouts: Workout[],
  days: number,
  now: Date = new Date(),
): number {
  return workouts
    .filter((w) => inLastDays(w.date, days, now))
    .reduce((s, w) => s + workoutVolume(w), 0);
}

/** Sets per muscle group over the last `days`. */
export function muscleBalance(
  workouts: Workout[],
  days: number,
  now: Date = new Date(),
): Partial<Record<MuscleGroup, number>> {
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const w of workouts) {
    if (!inLastDays(w.date, days, now)) continue;
    for (const e of w.entries) {
      out[e.muscle] = (out[e.muscle] ?? 0) + e.sets.length;
    }
  }
  return out;
}

/** Workouts per focus/split label over the last `days`. */
export function splitBalance(
  workouts: Workout[],
  days: number,
  now: Date = new Date(),
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (!inLastDays(w.date, days, now)) continue;
    const f = w.focus || "Other";
    out[f] = (out[f] ?? 0) + 1;
  }
  return out;
}

// ── per-exercise history + PRs ───────────────────────────────────────────────

export type ExerciseSession = {
  date: string;
  topWeightKg: number;
  bestE1RM: number;
  volume: number;
  sets: number;
};

export function exerciseHistory(
  workouts: Workout[],
  exerciseId: string,
): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    let topWeight = 0;
    let bestE = 0;
    let vol = 0;
    for (const s of entry.sets) {
      if (typeof s.weightKg === "number") topWeight = Math.max(topWeight, s.weightKg);
      bestE = Math.max(bestE, setE1RM(s));
      vol += setVolume(s);
    }
    out.push({
      date: w.date,
      topWeightKg: topWeight,
      bestE1RM: bestE,
      volume: vol,
      sets: entry.sets.length,
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export type PRecord = {
  exerciseId: string;
  name: string;
  date: string;
  weightKg: number;
  reps: number;
  e1RM: number;
};

/** All-time best estimated 1RM per exercise, strongest first. */
export function exercisePRs(workouts: Workout[]): PRecord[] {
  const best = new Map<string, PRecord>();
  for (const w of workouts) {
    for (const e of w.entries) {
      for (const s of e.sets) {
        if (typeof s.weightKg !== "number" || typeof s.reps !== "number") continue;
        const e1 = setE1RM(s);
        if (e1 <= 0) continue;
        const cur = best.get(e.exerciseId);
        if (!cur || e1 > cur.e1RM) {
          best.set(e.exerciseId, {
            exerciseId: e.exerciseId,
            name: e.name,
            date: w.date,
            weightKg: s.weightKg,
            reps: s.reps,
            e1RM: e1,
          });
        }
      }
    }
  }
  return [...best.values()].sort((a, b) => b.e1RM - a.e1RM);
}

/** PR events from the last `days` — a set that beat that exercise's prior best. */
export function recentPRs(
  workouts: Workout[],
  days = 30,
  now: Date = new Date(),
): PRecord[] {
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  const running = new Map<string, number>();
  const events: PRecord[] = [];
  for (const w of sorted) {
    for (const e of w.entries) {
      let top: { e1: number; weightKg: number; reps: number } | null = null;
      for (const s of e.sets) {
        if (typeof s.weightKg !== "number" || typeof s.reps !== "number") continue;
        const e1 = setE1RM(s);
        if (e1 <= 0) continue;
        if (!top || e1 > top.e1) top = { e1, weightKg: s.weightKg, reps: s.reps };
      }
      if (!top) continue;
      const prior = running.get(e.exerciseId) ?? 0;
      if (top.e1 > prior) {
        running.set(e.exerciseId, top.e1);
        // A first-ever log is a baseline, not a "new" PR.
        if (prior > 0 && inLastDays(w.date, days, now)) {
          events.push({
            exerciseId: e.exerciseId,
            name: e.name,
            date: w.date,
            weightKg: top.weightKg,
            reps: top.reps,
            e1RM: top.e1,
          });
        }
      }
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}
