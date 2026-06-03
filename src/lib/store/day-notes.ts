"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type StoredDayNote } from "./db";

/** Save (or clear, when empty) the scratchpad for a given YYYY-MM-DD. */
export async function saveDayNote(date: string, body: string): Promise<void> {
  if (!body.trim()) {
    await db.dayNotes.delete(date);
    return;
  }
  await db.dayNotes.put({ date, body, updatedAt: new Date() });
}

/** The note for one day. undefined = loading, null = none. */
export function useDayNote(
  date: string | null,
): StoredDayNote | null | undefined {
  return useLiveQuery(async () => {
    if (!date) return null;
    return (await db.dayNotes.get(date)) ?? null;
  }, [date]);
}

/** Set of dates that currently have a non-empty note (for grid indicators). */
export function useDayNoteDates(): Set<string> | undefined {
  return useLiveQuery(async () => {
    const all = await db.dayNotes.toArray();
    return new Set(all.filter((n) => n.body.trim()).map((n) => n.date));
  });
}
