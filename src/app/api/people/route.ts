import { auth } from "@/auth";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { nanoid } from "nanoid";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  handle: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { name, handle } = parsed.data;

  const [row] = await db
    .insert(items)
    .values({
      id: nanoid(),
      userId,
      kind: "person",
      title: name,
      status: "active",
      capturedVia: "web",
      metadata: { handle: handle || undefined },
    })
    .returning();

  return Response.json({ item: row });
}
