/**
 * Habit helpers. Habits are "items" of kind="habit" with metadata:
 *   {
 *     cadence: "daily" | "weekdays" | "weekly",
 *     checkins: string[]    // ymd strings, e.g. "2026-05-21"
 *   }
 *
 * A few derived numbers — current week, current streak, pending-today — depend
 * on the cadence semantics, so they live here instead of being re-implemented
 * in three places.
 */
import { ymd } from "@/lib/ymd";

export type Cadence = "daily" | "weekdays" | "weekly";

/** Sunday-anchored start-of-week for any date (local). */
export function startOfWeek(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = x.getDay(); // 0 = Sun … 6 = Sat
  x.setDate(x.getDate() - dow);
  return x;
}

/** All 7 ymd strings of the week containing `d` (Sun → Sat). */
export function weekDates(d: Date = new Date()): string[] {
  const sunday = startOfWeek(d);
  return Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    return ymd(day);
  });
}

/**
 * Cadence-aware streak.
 *
 *   daily / weekdays — consecutive days with a check-in. (`weekdays` ignores
 *   weekends when counting backwards, so a Mon–Fri-only routine doesn't break
 *   on Saturday.)
 *
 *   weekly — consecutive weeks (Sunday-anchored) with ≥1 check-in. So a
 *   gym-3x-a-week habit can still build a streak.
 *
 * Today/this-week is allowed to be unmarked without breaking the streak.
 */
export function calcStreak(
  checkins: Set<string>,
  cadence: Cadence = "daily",
): number {
  if (cadence === "weekly") {
    let streak = 0;
    const weekStart = startOfWeek();
    for (let w = 0; w < 104; w++) {
      let hit = false;
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() - w * 7 + d);
        if (checkins.has(ymd(day))) {
          hit = true;
          break;
        }
      }
      if (hit) streak++;
      else if (w === 0) continue;
      else break;
    }
    return streak;
  }

  // daily / weekdays
  const skipWeekends = cadence === "weekdays";
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const dow = cursor.getDay();
    if (skipWeekends && (dow === 0 || dow === 6)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    const key = ymd(cursor);
    if (checkins.has(key)) {
      streak++;
    } else if (i === 0) {
      // today not yet done — don't break, just look at yesterday
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Is a habit "pending" for this period? Used by the sidebar badge and the
 * Today What-Now card.
 *
 *   weekly  — pending if no check-in this calendar week
 *   weekdays — pending if today is a weekday and not yet checked
 *   daily    — pending if today is not checked
 */
export function isPending(
  checkins: string[],
  cadence: Cadence = "daily",
): boolean {
  const set = new Set(checkins);
  if (cadence === "weekly") {
    return !weekDates().some((d) => set.has(d));
  }
  if (cadence === "weekdays") {
    const dow = new Date().getDay();
    if (dow === 0 || dow === 6) return false; // weekends off
  }
  return !set.has(ymd());
}

/** Count of check-ins for this current week (Sun → Sat). */
export function thisWeekCount(checkins: string[]): number {
  const set = new Set(checkins);
  let n = 0;
  for (const d of weekDates()) if (set.has(d)) n++;
  return n;
}
