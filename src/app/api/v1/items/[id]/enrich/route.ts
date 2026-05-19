import { requireApiUser } from "@/lib/api-auth";
import { enrichItem } from "@/lib/enrich/run";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let userId: string;
  try {
    userId = await requireApiUser(req);
  } catch (resp) {
    return resp as Response;
  }
  const { id } = await ctx.params;
  await enrichItem(userId, id);
  return Response.json({ ok: true });
}
