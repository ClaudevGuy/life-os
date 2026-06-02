import { NextResponse } from "next/server";
import { buildAuthUrl, isConfigured } from "@/lib/youtube";

/** Kick off the Google OAuth consent flow. */
export async function GET(req: Request) {
  if (!isConfigured()) {
    return NextResponse.redirect(new URL("/music?error=unconfigured", req.url));
  }
  return NextResponse.redirect(buildAuthUrl(req));
}
