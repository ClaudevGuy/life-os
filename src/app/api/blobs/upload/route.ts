import { getViewerId } from "@/lib/viewer";
import { saveBlob } from "@/lib/blobs";

export async function POST(req: Request) {
  const userId = await getViewerId();
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "invalid_form" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "missing_file" }, { status: 400 });
  }
  try {
    const meta = await saveBlob(userId, file);
    return Response.json(meta);
  } catch (err) {
    return Response.json(
      { error: "upload_failed", detail: err instanceof Error ? err.message : "unknown" },
      { status: 400 },
    );
  }
}
