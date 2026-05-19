import { auth } from "@/auth";
import { db } from "@/db/client";
import { items } from "@/db/schema";
import { nanoid } from "nanoid";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().min(1).max(280),
  body: z.string().max(20_000).optional(),
  reviewAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .optional(),
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
  const { title, body, reviewAt } = parsed.data;

  const [row] = await db
    .insert(items)
    .values({
      id: nanoid(),
      userId,
      kind: "decision",
      title,
      body: body ?? null,
      status: "active",
      capturedVia: "web",
      metadata: {
        reviewAt: reviewAt
          ? new Date(`${reviewAt}T09:00:00`).toISOString()
          : null,
        outcome: "pending",
      },
    })
    .returning();

  return Response.json({ item: row });
}
