import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  COOKIE_REFRESH,
  exchangeCode,
  ytGet,
} from "@/lib/youtube";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/** Google redirects here with ?code=… after consent. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/music?error=${error ?? "no_code"}`, req.url),
    );
  }

  try {
    const tokens = await exchangeCode(req, code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/music?error=no_refresh", req.url));
    }

    // Best-effort channel name for display.
    let name = "";
    try {
      const ch = (await ytGet(
        "channels",
        { part: "snippet", mine: "true" },
        tokens.access_token,
      )) as { items?: Array<{ snippet?: { title?: string } }> };
      name = ch.items?.[0]?.snippet?.title ?? "";
    } catch {
      // non-fatal
    }

    const res = NextResponse.redirect(new URL("/music?connected=1", req.url));
    res.cookies.set(COOKIE_REFRESH, tokens.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: THIRTY_DAYS,
    });
    if (name) {
      res.cookies.set(COOKIE_NAME, name, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: THIRTY_DAYS,
      });
    }
    return res;
  } catch {
    return NextResponse.redirect(
      new URL("/music?error=exchange_failed", req.url),
    );
  }
}
