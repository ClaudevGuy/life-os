"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X, Upload, Loader2 } from "lucide-react";

type Photo = string; // blob id

export function PhotoGallery({
  itemId,
  metadata,
  emptyHint = "Drop an image, click to upload, or paste (⌘V)",
}: {
  itemId: string;
  metadata: Record<string, unknown>;
  emptyHint?: string;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(
    (metadata.photos as Photo[] | undefined) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;
      setUploading(true);
      try {
        const newIds: string[] = [];
        for (const file of list) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/blobs/upload", { method: "POST", body: fd });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as { detail?: string } | null;
            toast.error(err?.detail ?? "Upload failed");
            continue;
          }
          const data = (await res.json()) as { id: string };
          newIds.push(data.id);
        }
        if (newIds.length === 0) return;
        const next = [...photos, ...newIds];
        setPhotos(next);
        startTransition(async () => {
          await fetch(`/api/items/${itemId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              metadata: { ...metadata, photos: next },
            }),
          });
          router.refresh();
        });
        toast.success(`${newIds.length} photo${newIds.length === 1 ? "" : "s"} added`);
      } finally {
        setUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, itemId, metadata],
  );

  const removePhoto = useCallback(
    (id: string) => {
      const next = photos.filter((p) => p !== id);
      setPhotos(next);
      startTransition(async () => {
        await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            metadata: { ...metadata, photos: next },
          }),
        });
        fetch(`/api/blobs/${id}`, { method: "DELETE" }).catch(() => {});
        router.refresh();
      });
    },
    [photos, itemId, metadata, router],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) void upload(e.dataTransfer.files);
  }

  function onPaste(e: React.ClipboardEvent) {
    const files: File[] = [];
    for (const item of e.clipboardData.items) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void upload(files);
    }
  }

  return (
    <div
      className="mt-10"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={-1}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] inline-flex items-center gap-1.5">
          <ImagePlus size={11} />
          Photos · {photos.length}
        </h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md text-xs px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition disabled:opacity-50"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`life-card w-full p-8 text-center text-sm text-[var(--text-faint)] hover:text-[var(--text-muted)] transition border-dashed ${
            dragOver ? "border-[var(--accent)] bg-[var(--accent-glow)]" : ""
          }`}
          style={{ borderStyle: "dashed" }}
        >
          <ImagePlus
            size={20}
            className={`mx-auto mb-2 ${dragOver ? "text-[var(--accent)]" : "text-[var(--text-faint)]"}`}
          />
          {emptyHint}
        </button>
      ) : (
        <div
          className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${
            dragOver ? "ring-2 ring-[var(--accent)] rounded-lg" : ""
          }`}
        >
          {photos.map((id) => (
            <div
              key={id}
              className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border-soft)] group bg-[var(--bg-rail)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/blobs/${id}`}
                alt=""
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightbox(id)}
              />
              <button
                type="button"
                onClick={() => removePhoto(id)}
                disabled={pending}
                className="absolute top-1.5 right-1.5 grid place-items-center w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition"
                aria-label="Remove photo"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur grid place-items-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/blobs/${lightbox}`}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

/** Compact thumbnail used in card views (journal list, highlight list, etc.) */
export function PhotoThumb({ id, size = 48 }: { id: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/blobs/${id}`}
      alt=""
      width={size}
      height={size}
      className="rounded-md object-cover shrink-0 border border-[var(--border-soft)]"
      style={{ width: size, height: size }}
    />
  );
}
