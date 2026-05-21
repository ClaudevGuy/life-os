/**
 * Date → "YYYY-MM-DD" using LOCAL components (not UTC).
 *
 * The naive approach — `d.toISOString().slice(0, 10)` — silently converts to
 * UTC, which shifts the date by one day for any user in a non-UTC timezone
 * near midnight. That broke check-in storage and weekday labelling on the
 * Habits screen for anyone east of UTC.
 *
 * Use this helper for any date-key string that represents a local calendar
 * day: habit check-ins, weekday cell ids, daily counts, etc.
 */
export function ymd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
