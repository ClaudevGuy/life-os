import { requireApiUser } from "@/lib/api-auth";
import { searchItems } from "@/lib/search";

export async function GET(req: Request) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);

  const hits = await searchItems({ userId, q, limit });
  return Response.json({ hits });
}
