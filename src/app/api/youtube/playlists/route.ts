import {
  accessTokenFromCookies,
  mapPlaylists,
  ytGet,
  type Playlist,
} from "@/lib/youtube";

/** The user's playlists, with "Liked videos" pinned on top. */
export async function GET() {
  const token = await accessTokenFromCookies();
  if (!token) return Response.json({ error: "not_connected" }, { status: 401 });

  try {
    const json = await ytGet(
      "playlists",
      { part: "snippet,contentDetails", mine: "true", maxResults: "50" },
      token,
    );
    const playlists: Playlist[] = mapPlaylists(json);
    // "LL" is the authenticated user's Liked videos — populated on click.
    playlists.unshift({
      id: "LL",
      title: "Liked videos",
      count: null,
      thumbnail: null,
    });
    return Response.json({ playlists });
  } catch (e) {
    return Response.json(
      { error: "fetch_failed", detail: e instanceof Error ? e.message : "?" },
      { status: 502 },
    );
  }
}
