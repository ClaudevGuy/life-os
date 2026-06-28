"use client";

/**
 * Per-channel credentials + the Telegram session string, stored in the local
 * appKV table (never synced, never exported). These are sensitive — the
 * Telegram session string is a full account credential and the OAuth client
 * IDs are yours — so they live only in this browser's IndexedDB.
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

export const tgCreds = {
  async get() {
    const [apiId, apiHash, session] = await Promise.all([
      kvGet<number>("msg.tg.apiId"),
      kvGet<string>("msg.tg.apiHash"),
      kvGet<string>("msg.tg.session"),
    ]);
    return { apiId, apiHash, session };
  },
  async setApi(apiId: number, apiHash: string) {
    await Promise.all([
      kvSet("msg.tg.apiId", apiId),
      kvSet("msg.tg.apiHash", apiHash),
    ]);
  },
  setSession: (s: string) => kvSet("msg.tg.session", s),
  async clear() {
    await Promise.all([
      kvDel("msg.tg.apiId"),
      kvDel("msg.tg.apiHash"),
      kvDel("msg.tg.session"),
    ]);
  },
};

export const gmailCreds = {
  getClientId: () => kvGet<string>("msg.gmail.clientId"),
  setClientId: (id: string) => kvSet("msg.gmail.clientId", id),
  clear: () => kvDel("msg.gmail.clientId"),
};
