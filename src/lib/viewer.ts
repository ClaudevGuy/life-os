import { auth } from "@/auth";

const DEMO_USER_ID = "demo-user";

/** Returns the signed-in user's id, or a demo id when auth/DB aren't configured. */
export async function getViewerId(): Promise<string> {
  try {
    const session = await auth();
    const id = (session?.user as { id?: string } | undefined)?.id;
    return id ?? DEMO_USER_ID;
  } catch {
    return DEMO_USER_ID;
  }
}

export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

import { listDemoItems } from "@/lib/demo-store";
import { DEMO_ITEMS } from "@/lib/demo-data";
import type { Item } from "@/db/schema";

/**
 * Merge: server demo store (user-created in this session) + seeded demo data.
 * Used by pages when the DB returns empty.
 */
export function demoUniverse(userId: string): Item[] {
  return [...listDemoItems(userId), ...DEMO_ITEMS];
}
