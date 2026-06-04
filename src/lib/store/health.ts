/**
 * Daily health check-ins. One row per day (keyed by YYYY-MM-DD), upserted as
 * you tweak each metric. Weight is stored in kg; the UI converts for display.
 */
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type StoredHealthLog } from "./db";
import { ymd } from "@/lib/ymd";

export type { StoredHealthLog } from "./db";

export type HealthMetricKey =
  | "mood"
  | "energy"
  | "sleepHours"
  | "weightKg"
  | "activeMin"
  | "water";

export type WeightUnit = "kg" | "lb";

/** Logs for the last `days` days, oldest → newest. */
export function useHealthLogs(days = 30): StoredHealthLog[] | undefined {
  return useLiveQuery(async () => {
    const start = ymd(new Date(Date.now() - (days - 1) * 86_400_000));
    const rows = await db.healthLogs
      .where("date")
      .aboveOrEqual(start)
      .toArray();
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [days]);
}

export function useHealthLog(date: string): StoredHealthLog | undefined {
  return useLiveQuery(async () => {
    return (await db.healthLogs.get(date)) ?? undefined;
  }, [date]);
}

/** Upsert today's (or any day's) log by merging a patch. */
export async function saveHealthLog(
  date: string,
  patch: Partial<Omit<StoredHealthLog, "date" | "updatedAt">>,
): Promise<void> {
  const existing = await db.healthLogs.get(date);
  await db.healthLogs.put({
    date,
    ...existing,
    ...patch,
    updatedAt: new Date(),
  });
}

// ── weight unit ───────────────────────────────────────────────────────────────

const LB_PER_KG = 2.2046226218;

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * LB_PER_KG : kg;
}
export function unitToKg(v: number, unit: WeightUnit): number {
  return unit === "lb" ? v / LB_PER_KG : v;
}

// ── scales / labels ───────────────────────────────────────────────────────────

export const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];
export const MOOD_LABEL = ["Rough", "Low", "Okay", "Good", "Great"];
export const ENERGY_LABEL = ["Drained", "Low", "Steady", "Lively", "Charged"];

/** Color for a 1–5 score, red → amber → green. */
export function scoreColor(v: number): string {
  if (v <= 1) return "var(--bad)";
  if (v === 2) return "#D9894F";
  if (v === 3) return "var(--gold)";
  if (v === 4) return "#8FA86A";
  return "var(--sage)";
}

export function averageOf(
  logs: StoredHealthLog[],
  key: HealthMetricKey,
): number | null {
  const vals = logs
    .map((l) => l[key])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Consecutive days logged ending today. */
export function loggedStreak(logs: StoredHealthLog[]): number {
  const set = new Set(logs.map((l) => l.date));
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const d = ymd(new Date(Date.now() - i * 86_400_000));
    if (set.has(d)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}
