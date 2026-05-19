/**
 * Local-file blob storage. No Vercel Blob, no S3 — just bytes on disk under
 *   ./data/blobs/<userId>/<id>.<ext>
 *
 * Images only (jpeg/png/webp/gif). Hard 8 MB cap.
 * Filename contains the extension so /api/blobs/<id>.<ext> can look it up
 * directly and the right content-type is inferred without a sidecar.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

const BLOB_DIR = path.resolve(process.cwd(), "data", "blobs");
const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const MAX_BYTES = 8 * 1024 * 1024;

export type BlobMeta = { id: string; url: string; type: string; bytes: number };

function safeUserId(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function saveBlob(userId: string, file: File): Promise<BlobMeta> {
  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) throw new Error("Unsupported file type");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 8 MB)");

  const id = `${nanoid(12)}.${ext}`;
  const dir = path.join(BLOB_DIR, safeUserId(userId));
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, id);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buf);
  return {
    id,
    url: `/api/blobs/${id}`,
    type: file.type === "image/jpg" ? "image/jpeg" : file.type,
    bytes: buf.length,
  };
}

export async function readBlob(
  userId: string,
  id: string,
): Promise<{ data: Buffer; type: string } | null> {
  if (id.includes("/") || id.includes("..") || id.includes("\\")) return null;
  const filepath = path.join(BLOB_DIR, safeUserId(userId), id);
  try {
    const data = await fs.readFile(filepath);
    const ext = path.extname(id).slice(1).toLowerCase();
    const type =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "png"
        ? "image/png"
        : ext === "webp"
        ? "image/webp"
        : ext === "gif"
        ? "image/gif"
        : "application/octet-stream";
    return { data, type };
  } catch {
    return null;
  }
}

export async function deleteBlob(userId: string, id: string): Promise<boolean> {
  if (id.includes("/") || id.includes("..") || id.includes("\\")) return false;
  const filepath = path.join(BLOB_DIR, safeUserId(userId), id);
  try {
    await fs.unlink(filepath);
    return true;
  } catch {
    return false;
  }
}
