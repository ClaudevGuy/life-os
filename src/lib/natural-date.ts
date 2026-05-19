/**
 * Tiny natural-language date parser. Parses inline phrases at the end of a
 * task title and returns the residual title plus an ISO date string.
 *
 * Supported:
 *   "today", "tomorrow", "tmrw"
 *   "in 3 days", "in 2 weeks"
 *   "next week", "next month"
 *   "mon", "tue", "wed", "thu", "fri", "sat", "sun"
 *   "monday", "tuesday", ...  (next occurrence)
 *   "by friday", "due tomorrow", "on tue"
 *   "may 20", "jun 3"
 *
 * Returns null when nothing parses.
 */

const WEEKDAY: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function atNine(d: Date): Date {
  d.setHours(9, 0, 0, 0);
  return d;
}

function nextWeekday(target: number, from: Date = new Date()): Date {
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return atNine(d);
}

export type ParseResult = {
  title: string;
  date: Date;
  phrase: string;
};

const PHRASE_RE =
  /\s+(?:by|due|on|@)?\s*(today|tomorrow|tmrw|next\s+week|next\s+month|in\s+\d+\s+(?:days?|weeks?|months?)|(?:mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday)?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2})\s*$/i;

export function parseNaturalDate(input: string): ParseResult | null {
  const match = PHRASE_RE.exec(input);
  if (!match) return null;
  const phrase = match[1].toLowerCase().trim();
  const title = input.slice(0, match.index).trim();
  const date = phraseToDate(phrase);
  if (!date) return null;
  return { title, date, phrase: match[0].trim() };
}

function phraseToDate(p: string): Date | null {
  const now = new Date();
  if (p === "today") return atNine(new Date(now));
  if (p === "tomorrow" || p === "tmrw") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return atNine(d);
  }
  if (p === "next week") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return atNine(d);
  }
  if (p === "next month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return atNine(d);
  }
  const inMatch = /^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/.exec(p);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const d = new Date(now);
    if (unit.startsWith("day")) d.setDate(d.getDate() + n);
    else if (unit.startsWith("week")) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return atNine(d);
  }
  if (p in WEEKDAY) return nextWeekday(WEEKDAY[p], now);

  const monMatch = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})$/.exec(
    p,
  );
  if (monMatch) {
    const month = MONTH[monMatch[1]];
    const day = parseInt(monMatch[2], 10);
    if (day < 1 || day > 31) return null;
    const d = new Date(now.getFullYear(), month, day, 9, 0, 0, 0);
    // If date is already past this year, jump to next year
    if (d < now) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  return null;
}

/** Friendly label like "Fri, May 24" */
export function dateLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
