/**
 * Server-side helpers for the YouTube Music integration.
 *
 * There is no official "YouTube Music API", so we use the two official
 * surfaces Google does expose:
 *   - OAuth 2.0 (scope youtube.readonly) to connect the user's account
 *   - YouTube Data API v3 to read their playlists / liked songs
 * Playback itself happens client-side via the IFrame Player API (tracks
 * are YouTube videos underneath), so the access token is only ever used
 * here, on the server. The client never sees a token.
 *
 * Tokens live in httpOnly cookies. We store only the long-lived refresh
 * token and mint a fresh access token per request — simplest thing that
 * works for a personal, local-first app.
 *
 * NOTE: while the OAuth consent screen is in "Testing" status, Google
 * expires refresh tokens after 7 days, so you'll reconnect ~weekly. That
 * is a Google limitation, not ours.
 */

import { cookies } from "next/headers";
import type { Playlist, Track } from "@/lib/youtube-types";

export type { Playlist, Track } from "@/lib/youtube-types";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const API_BASE = "https://www.googleapis.com/youtube/v3";

export const COOKIE_REFRESH = "ytm_refresh";
export const COOKIE_NAME = "ytm_name";

export function getClientId(): string {
  const id = process.env.YOUTUBE_CLIENT_ID;
  if (!id) throw new Error("YOUTUBE_CLIENT_ID is not set");
  return id;
}

export function getClientSecret(): string {
  const secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!secret) throw new Error("YOUTUBE_CLIENT_SECRET is not set");
  return secret;
}

/** The literal example values from the setup guide — not real credentials. */
const PLACEHOLDERS = new Set(["your-id", "your-secret", "", "changeme"]);

export function isConfigured(): boolean {
  const id = process.env.YOUTUBE_CLIENT_ID?.trim();
  const secret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
  // Reject the unfilled example placeholders so the UI guides the user to
  // paste their REAL Client ID / secret instead of silently failing the
  // token exchange with `invalid_client`.
  return Boolean(
    id &&
      secret &&
      !PLACEHOLDERS.has(id) &&
      !PLACEHOLDERS.has(secret),
  );
}

/** Exact redirect URI — must match what's registered in Google Cloud. */
export function redirectUri(req: Request): string {
  return (
    process.env.YOUTUBE_REDIRECT_URI ||
    new URL("/api/youtube/callback", req.url).toString()
  );
}

export function buildAuthUrl(req: Request): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export async function exchangeCode(
  req: Request,
  code: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Mint a short-lived access token from a stored refresh token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as TokenResponse;
  return data.access_token ?? null;
}

/** Authenticated GET against the YouTube Data API. */
export async function ytGet(
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<unknown> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`youtube ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/**
 * Read the refresh token from cookies and mint a fresh access token.
 * Returns null when not connected or the refresh token has been revoked /
 * expired (e.g. the 7-day Testing-mode window lapsed).
 */
export async function accessTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  const refresh = store.get(COOKIE_REFRESH)?.value;
  if (!refresh) return null;
  return refreshAccessToken(refresh);
}

// ── Mapping the Data API responses to client shapes ──────────────────────

type Thumbnails = {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
};

function pickThumb(t: Thumbnails | undefined): string | null {
  return t?.medium?.url ?? t?.high?.url ?? t?.default?.url ?? null;
}

export function mapPlaylists(json: unknown): Playlist[] {
  const items =
    (json as { items?: Array<Record<string, unknown>> }).items ?? [];
  return items.map((it) => {
    const snippet = (it.snippet ?? {}) as {
      title?: string;
      thumbnails?: Thumbnails;
    };
    const contentDetails = (it.contentDetails ?? {}) as { itemCount?: number };
    return {
      id: String(it.id ?? ""),
      title: snippet.title ?? "Untitled playlist",
      count: contentDetails.itemCount ?? null,
      thumbnail: pickThumb(snippet.thumbnails),
    };
  });
}

export function mapPlaylistItems(json: unknown): {
  tracks: Track[];
  nextPageToken: string | null;
} {
  const data = json as {
    items?: Array<Record<string, unknown>>;
    nextPageToken?: string;
  };
  const tracks: Track[] = [];
  for (const it of data.items ?? []) {
    const snippet = (it.snippet ?? {}) as {
      title?: string;
      videoOwnerChannelTitle?: string;
      channelTitle?: string;
      thumbnails?: Thumbnails;
    };
    const contentDetails = (it.contentDetails ?? {}) as { videoId?: string };
    const videoId = contentDetails.videoId;
    const title = snippet.title ?? "";
    // Skip private/deleted entries — they can't be played.
    if (!videoId || title === "Private video" || title === "Deleted video") {
      continue;
    }
    tracks.push({
      videoId,
      title,
      channel:
        snippet.videoOwnerChannelTitle ?? snippet.channelTitle ?? "Unknown",
      thumbnail: pickThumb(snippet.thumbnails),
    });
  }
  return { tracks, nextPageToken: data.nextPageToken ?? null };
}

export function mapSearch(json: unknown): Track[] {
  const items =
    (json as { items?: Array<Record<string, unknown>> }).items ?? [];
  const tracks: Track[] = [];
  for (const it of items) {
    const id = (it.id ?? {}) as { videoId?: string };
    const snippet = (it.snippet ?? {}) as {
      title?: string;
      channelTitle?: string;
      thumbnails?: Thumbnails;
    };
    if (!id.videoId) continue;
    tracks.push({
      videoId: id.videoId,
      title: decodeEntities(snippet.title ?? ""),
      channel: snippet.channelTitle ?? "Unknown",
      thumbnail: pickThumb(snippet.thumbnails),
    });
  }
  return tracks;
}

/** Search snippets arrive HTML-escaped (&amp; &#39; …). Undo the common ones. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
