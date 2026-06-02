import { NextResponse } from "next/server";
import { COOKIE_NAME, COOKIE_REFRESH } from "@/lib/youtube";

/** Forget the connection — clears the stored tokens. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_REFRESH, "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
