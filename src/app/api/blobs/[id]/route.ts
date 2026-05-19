import { getViewerId } from "@/lib/viewer";
import { readBlob, deleteBlob } from "@/lib/blobs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getViewerId();
  const { id } = await ctx.params;
  const blob = await readBlob(userId, id);
  if (!blob) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(blob.data), {
    headers: {
      "content-type": blob.type,
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const userId = await getViewerId();
  const { id } = await ctx.params;
  const ok = await deleteBlob(userId, id);
  return Response.json({ ok });
}
