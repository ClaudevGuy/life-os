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

/* ── insights ─────────────────────────────────────────────────────────── */

/** A ymd string → a local Date at noon (avoids timezone edge cases). */
function ymdToDate(s: string): Date {
  return new Date(`${s}T12:00:00`);
}

function nextWeekday(d: Date): Date {
  const x = new Date(d);
  do {
    x.setDate(x.getDate() + 1);
  } while (x.getDay() === 0 || x.getDay() === 6);
  return x;
}

/** The longest run of consecutive periods ever achieved (all-time best). */
export function longestStreak(
  checkins: Set<string>,
  cadence: Cadence = "daily",
): number {
  if (checkins.size === 0) return 0;

  if (cadence === "weekly") {
    const weekKeys = new Set<string>();
    for (const c of checkins) weekKeys.add(ymd(startOfWeek(ymdToDate(c))));
    const weeks = [...weekKeys]
      .map((w) => ymdToDate(w))
      .sort((a, b) => a.getTime() - b.getTime());
    let best = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const w of weeks) {
      const gap = prev
        ? Math.round((w.getTime() - prev.getTime()) / (7 * 86_400_000))
        : 0;
      run = prev && gap === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = w;
    }
    return best;
  }

  const skipWeekends = cadence === "weekdays";
  const days = [...checkins]
    .map((c) => ymdToDate(c))
    .sort((a, b) => a.getTime() - b.getTime());
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    let consecutive = false;
    if (prev) {
      consecutive = skipWeekends
        ? ymd(nextWeekday(prev)) === ymd(d)
        : Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1;
    }
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** done / expected over the last `windowDays` (cadence-aware). */
export function completionRate(
  checkins: Set<string>,
  cadence: Cadence,
  windowDays: number,
): { done: number; total: number; pct: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (cadence === "weekly") {
    const weeks = Math.max(1, Math.round(windowDays / 7));
    let done = 0;
    for (let w = 0; w < weeks; w++) {
      const ws = startOfWeek(today);
      ws.setDate(ws.getDate() - w * 7);
      let hit = false;
      for (let i = 0; i < 7; i++) {
        const d = new Date(ws);
        d.setDate(ws.getDate() + i);
        if (d <= today && checkins.has(ymd(d))) {
          hit = true;
          break;
        }
      }
      if (hit) done++;
    }
    return { done, total: weeks, pct: Math.round((done / weeks) * 100) };
  }

  let done = 0;
  let total = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    if (cadence === "weekdays" && (dow === 0 || dow === 6)) continue;
    total++;
    if (checkins.has(ymd(d))) done++;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** The weekday (0=Sun … 6=Sat) the habit is checked off most often. */
export function bestWeekday(checkins: Set<string>): number | null {
  if (checkins.size === 0) return null;
  const counts = new Array(7).fill(0) as number[];
  for (const c of checkins) counts[ymdToDate(c).getDay()]++;
  let best = 0;
  for (let i = 1; i < 7; i++) if (counts[i] > counts[best]) best = i;
  return counts[best] > 0 ? best : null;
}

/** Earliest check-in ymd, or null. */
export function firstCheckin(checkins: Set<string>): string | null {
  if (checkins.size === 0) return null;
  return [...checkins].sort()[0];
}
