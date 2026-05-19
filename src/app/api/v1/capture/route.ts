import { after } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { captureItem } from "@/lib/items";
import { enrichItem } from "@/lib/enrich/run";

const bodySchema = z.object({
  kind: z.enum([
    "bookmark",
    "note",
    "decision",
    "person",
    "journal",
    "voice",
    "task",
    "idea",
  ]).default("bookmark"),
  title: z.string().max(280).optional(),
  body: z.string().max(50_000).optional(),
  sourceUrl: z.string().url().optional(),
  rawText: z.string().max(120_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { item, duplicate } = await captureItem({
    userId,
    kind: input.kind,
    title: input.title ?? null,
    body: input.body ?? null,
    sourceUrl: input.sourceUrl ?? null,
    rawText: input.rawText ?? null,
    capturedVia: "api",
    metadata: input.metadata ?? {},
  });

  // Fire-and-forget enrichment.
  if (!duplicate) {
    after(async () => {
      try {
        await enrichItem(userId, item.id);
      } catch (err) {
        console.error("[capture] enrich failed:", err);
      }
    });
  }

  return Response.json({ item, duplicate });
}
