import { accessTokenFromCookies, mapSearch, ytGet } from "@/lib/youtube";

/** Search YouTube's Music category. Costs 100 quota units per call. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ tracks: [] });

  const token = await accessTokenFromCookies();
  if (!token) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const json = await ytGet(
      "search",
      {
        part: "snippet",
        type: "video",
        videoCategoryId: "10", // Music
        maxResults: "20",
        q,
      },
      token,
    );
    return Response.json({ tracks: mapSearch(json) });
  } catch (e) {
    return Response.json(
      { error: "fetch_failed", detail: e instanceof Error ? e.message : "?" },
      { status: 502 },
    );
  }
}
