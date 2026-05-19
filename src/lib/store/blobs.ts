/**
 * Photo storage. Blobs live inside IndexedDB next to the items that reference
 * them — no `/api/blobs` proxy needed in the browser-only architecture.
 * The returned ids are stored in an item's metadata.photos array.
 */
"use client";

import { nanoid } from "nanoid";
import { db, type StoredBlob } from "./db";

const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function saveBlob(file: File | Blob): Promise<StoredBlob> {
  const type = file.type;
  const ext = ALLOWED_TYPES.get(type);
  if (!ext) throw new Error("Unsupported file type");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 8 MB)");

  const id = `${nanoid(12)}.${ext}`;
  const record: StoredBlob = {
    id,
    type: type === "image/jpg" ? "image/jpeg" : type,
    bytes: file.size,
    data: file instanceof File ? file : new Blob([file], { type }),
    createdAt: new Date(),
  };
  await db.blobs.add(record);
  return record;
}

export async function readBlob(id: string): Promise<StoredBlob | null> {
  return (await db.blobs.get(id)) ?? null;
}

export async function deleteBlob(id: string): Promise<boolean> {
  const existing = await db.blobs.get(id);
  if (!existing) return false;
  await db.blobs.delete(id);
  return true;
}

/**
 * Convert a stored blob id into a transient `blob:` URL the browser can use
 * in <img src>. Caller is responsible for revoking when no longer needed.
 */
export async function blobUrl(id: string): Promise<string | null> {
  const stored = await readBlob(id);
  if (!stored) return null;
  return URL.createObjectURL(stored.data);
}
