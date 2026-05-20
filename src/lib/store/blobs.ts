/**
 * Blob storage. Lives inside IndexedDB next to the items that reference it —
 * no `/api/blobs` proxy needed in the browser-only architecture.
 *
 * Two flavors:
 *  - Image blobs (saveBlob) — capped at 8 MB, used by photo galleries.
 *  - Document blobs (saveFileBlob) — capped at 25 MB, used by the Files page
 *    for PDFs, Word docs, plain text, markdown, CSV, etc.
 *
 * The returned `id` is the handle stored on items (`metadata.photos` for
 * images, `metadata.fileBlobId` for files).
 */
"use client";

import { nanoid } from "nanoid";
import { db, type StoredBlob } from "./db";

const ALLOWED_IMAGE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function saveBlob(file: File | Blob): Promise<StoredBlob> {
  const type = file.type;
  const ext = ALLOWED_IMAGE_TYPES.get(type);
  if (!ext) throw new Error("Unsupported file type");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("File too large (max 8 MB)");

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

/**
 * Store a generic document blob (PDF, Word, txt, etc.). Returns the blob id
 * the caller should write to its item's metadata.
 */
export async function saveFileBlob(file: File): Promise<StoredBlob> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large (max 25 MB)");
  }
  const ext = extFromFileName(file.name) ?? extFromMime(file.type) ?? "bin";
  const id = `${nanoid(12)}.${ext}`;
  const record: StoredBlob = {
    id,
    type: file.type || "application/octet-stream",
    bytes: file.size,
    data: file,
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

/**
 * Trigger a browser download for a stored blob. Returns false if the blob is
 * missing (e.g. user wiped data on another device since the item was synced).
 */
export async function downloadBlob(
  id: string,
  fileName: string,
): Promise<boolean> {
  const stored = await readBlob(id);
  if (!stored) return false;
  const url = URL.createObjectURL(stored.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function extFromFileName(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

function extFromMime(type: string): string | null {
  switch (type) {
    case "application/pdf":
      return "pdf";
    case "application/msword":
      return "doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "docx";
    case "application/vnd.ms-excel":
      return "xls";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "xlsx";
    case "text/plain":
      return "txt";
    case "text/markdown":
      return "md";
    case "text/csv":
      return "csv";
    case "application/json":
      return "json";
    case "application/zip":
      return "zip";
    default:
      return null;
  }
}
