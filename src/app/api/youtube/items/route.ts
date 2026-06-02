import {
  accessTokenFromCookies,
  mapPlaylistItems,
  ytGet,
} from "@/lib/youtube";

/** Tracks inside a playlist (paginated via ?pageToken). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const playlistId = url.searchParams.get("playlistId");
  const pageToken = url.searchParams.get("pageToken") ?? undefined;
  if (!playlistId) {
    return Response.json({ error: "missing_playlist" }, { status: 400 });
  }

  const token = await accessTokenFromCookies();
  if (!token) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;
    const json = await ytGet("playlistItems", params, token);
    return Response.json(mapPlaylistItems(json));
  } catch (e) {
    return Response.json(
      { error: "fetch_failed", detail: e instanceof Error ? e.message : "?" },
      { status: 502 },
    );
  }
}
