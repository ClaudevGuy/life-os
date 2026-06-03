/**
 * Net-worth snapshots — one row per day so the Finance page can draw a trend.
 * Written opportunistically when the Finance page has a fresh, fully-priced
 * net-worth figure (see `recordSnapshot`). Purely local.
 */
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type StoredNetWorthSnapshot } from "./db";
import { ymd } from "@/lib/ymd";

export type { StoredNetWorthSnapshot } from "./db";

/** All snapshots, oldest → newest. */
export function useSnapshots(): StoredNetWorthSnapshot[] | undefined {
  return useLiveQuery(() => db.netWorthSnapshots.orderBy("date").toArray());
}

/**
 * Record today's net worth. Idempotent within a day: overwrites today's row.
 * Skips the write when today's stored figure already matches (to the cent) and
 * the base currency is unchanged, so we don't thrash IndexedDB on every render.
 */
export async function recordSnapshot(input: {
  base: string;
  net: number;
  assets: number;
  liabilities: number;
}): Promise<void> {
  const date = ymd(new Date());
  const existing = await db.netWorthSnapshots.get(date);
  const round = (n: number) => Math.round(n * 100) / 100;
  if (
    existing &&
    existing.base === input.base &&
    round(existing.net) === round(input.net) &&
    round(existing.assets) === round(input.assets) &&
    round(existing.liabilities) === round(input.liabilities)
  ) {
    return;
  }
  await db.netWorthSnapshots.put({
    date,
    base: input.base,
    net: round(input.net),
    assets: round(input.assets),
    liabilities: round(input.liabilities),
    updatedAt: new Date(),
  });
}
