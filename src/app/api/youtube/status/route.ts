import { cookies } from "next/headers";
import { COOKIE_NAME, COOKIE_REFRESH, isConfigured } from "@/lib/youtube";

/** Is the account connected? Drives the Connect vs. player UI. */
export async function GET() {
  const store = await cookies();
  return Response.json({
    configured: isConfigured(),
    connected: Boolean(store.get(COOKIE_REFRESH)?.value),
    name: store.get(COOKIE_NAME)?.value ?? null,
  });
}
