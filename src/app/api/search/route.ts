import { getViewerId } from "@/lib/viewer";
import { searchItems } from "@/lib/search";
import { DEMO_ITEMS } from "@/lib/demo-data";

export async function GET(req: Request) {
  const userId = await getViewerId();
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);

  if (!q.trim()) return Response.json({ hits: [] });

  let hits: Awaited<ReturnType<typeof searchItems>> = [];
  try {
    hits = await searchItems({ userId, q, limit });
  } catch {
    hits = [];
  }

  if (hits.length === 0) {
    const needle = q.toLowerCase();
    hits = DEMO_ITEMS.filter((i) => {
      const hay = [i.title, i.summary, i.body, i.topic, ...(i.keyPoints ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    })
      .slice(0, limit)
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        title: i.title,
        summary: i.summary,
        topic: i.topic,
        sourceUrl: i.sourceUrl,
        capturedAt: i.capturedAt,
        score: 1,
      }));
  }

  return Response.json({ hits });
}
