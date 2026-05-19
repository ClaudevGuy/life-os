/**
 * Session-scoped capture endpoint used by the in-app QuickCapture button.
 * Distinct from /api/v1/capture which is the bearer-token external API.
 */
import { after } from "next/server";
import { z } from "zod";
import { getViewerId } from "@/lib/viewer";
import { captureItem } from "@/lib/items";
import { enrichItem } from "@/lib/enrich/run";
import { bumpLastContactedForLinkedPeople } from "@/lib/people";

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
    "goal",
    "habit",
    "highlight",
    "project",
    "area",
  ]),
  title: z.string().max(280).optional(),
  body: z.string().max(50_000).optional(),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const userId = await getViewerId();

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 });
  }

  const input = parsed.data;
  const { item, duplicate } = await captureItem({
    userId,
    kind: input.kind,
    title: input.title ?? null,
    body: input.body ?? null,
    sourceUrl: input.sourceUrl ?? null,
    capturedVia: "web",
    metadata: input.metadata ?? {},
  });

  if (!duplicate) {
    after(async () => {
      try {
        await enrichItem(userId, item.id);
      } catch (err) {
        console.error("[capture] enrich failed:", err);
      }
    });
    // If the body mentions [[Person Name]], bump their lastContactedAt
    if (input.body) {
      after(async () => {
        try {
          await bumpLastContactedForLinkedPeople(userId, input.body!);
        } catch (err) {
          console.error("[capture] last-contacted bump failed:", err);
        }
      });
    }
  }

  return Response.json({ item, duplicate });
}
