import { auth } from "@/auth";
import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { generateApiKey } from "@/lib/api-auth";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));

  return Response.json({ keys: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { name } = (await req.json().catch(() => ({}))) as { name?: string };
  if (!name || typeof name !== "string" || name.length > 64) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const { raw, hashedKey, prefix } = generateApiKey();

  const [row] = await db
    .insert(apiKeys)
    .values({ userId, name, hashedKey, prefix })
    .returning({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix });

  // Raw key is shown ONCE and never again.
  return Response.json({ key: row, raw });
}
