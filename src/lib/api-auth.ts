import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const KEY_PREFIX = "lifeos_";

/** Generate a new bearer token. Returns the raw key (show once) and the hash. */
export function generateApiKey(): { raw: string; hashedKey: string; prefix: string } {
  const random = randomBytes(32).toString("base64url");
  const raw = `${KEY_PREFIX}${random}`;
  const hashedKey = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, KEY_PREFIX.length + 4); // e.g. lifeos_abcd
  return { raw, hashedKey, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Look up the user for a bearer token. Returns null if invalid/revoked. */
export async function userIdForApiKey(raw: string | null | undefined): Promise<string | null> {
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null;
  const hashedKey = hashApiKey(raw);
  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.hashedKey, hashedKey), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!row) return null;

  // fire-and-forget lastUsedAt update
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return row.userId;
}

/** Parse Authorization header. */
export function bearerFromRequest(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** All-in-one: returns userId or throws a Response. */
export async function requireApiUser(req: Request): Promise<string> {
  const raw = bearerFromRequest(req);
  const userId = await userIdForApiKey(raw);
  if (!userId) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return userId;
}
