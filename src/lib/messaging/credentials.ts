"use client";

/**
 * Per-channel credentials stored in the local appKV table (never synced, never
 * exported). These are sensitive — the OAuth client ID is yours — so they live
 * only in this browser's IndexedDB.
 */
import { db } from "@/lib/store/db";

async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await db.appKV.get(key);
  return row?.value as T | undefined;
}
function kvSet(key: string, value: unknown): Promise<string> {
  return db.appKV.put({ key, value });
}
function kvDel(key: string): Promise<void> {
  return db.appKV.delete(key);
}

export const gmailCreds = {
  getClientId: () => kvGet<string>("msg.gmail.clientId"),
  setClientId: (id: string) => kvSet("msg.gmail.clientId", id),
  clear: () => kvDel("msg.gmail.clientId"),
};
