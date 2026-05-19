"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { StoredItem as Item } from "@/lib/store/items";
import { Sparkles, ImagePlus, X, BookOpen } from "lucide-react";
import { captureItem, updateItem } from "@/lib/store/items";
import { saveBlob, deleteBlob } from "@/lib/store/blobs";
import { BlobImg } from "@/components/blob-img";

const MOODS = ["😄", "🙂", "😐", "😕", "😫"] as const;

// Rotating prompts, picked by weekday so the same prompt anchors the same day
const PROMPTS_BY_DAY: Record<number, string> = {
  0: "Sunday — what do you want this week to feel like?",
  1: "Monday — what's one move that will matter most this week?",
  2: "Tuesday — what's still on your mind from yesterday?",
  3: "Wednesday — midweek check-in. Are you spending energy on what matters?",
  4: "Thursday — what would make tomorrow great?",
  5: "Friday — what shipped, what slipped, what surprised you?",
  6: "Saturday — what do you want to remember about today?",
};

export function JournalForm({ existing }: { existing: Item | null }) {
  const [pending, startTransition] = useTransition();
  const existingMeta = (existing?.metadata ?? {}) as {
    energy?: number;
    mood?: string;
  };

  const [body, setBody] = useState(existing?.body ?? "");
  const [energy, setEnergy] = useState<number>(existingMeta.energy ?? 3);
  const [mood, setMood] = useState<string>(existingMeta.mood ?? "🙂");
  const [photos, setPhotos] = useState<string[]>(
    ((existing?.metadata ?? {}) as { photos?: string[] }).photos ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      const newIds: string[] = [];
      for (const file of list) {
        try {
          const saved = await saveBlob(file);
          newIds.push(saved.id);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        }
      }
      if (newIds.length === 0) return;
      const next = [...photos, ...newIds];
      setPhotos(next);
      if (existing) {
        await updateItem(existing.id, {
          metadata: { ...existingMeta, photos: next },
        });
      }
      toast.success(`${newIds.length} photo${newIds.length === 1 ? "" : "s"} added`);
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(id: string) {
    const next = photos.filter((p) => p !== id);
    setPhotos(next);
    if (existing) {
      await updateItem(existing.id, {
        metadata: { ...existingMeta, photos: next },
      });
    }
    await deleteBlob(id).catch(() => {});
  }

  const prompt = useMemo(() => {
    const dow = new Date().getDay();
    return PROMPTS_BY_DAY[dow] ?? PROMPTS_BY_DAY[0];
  }, []);

  async function save() {
    if (!body.trim()) {
      toast.error("Write something first");
      return;
    }
    startTransition(async () => {
      const metadata: Record<string, unknown> = { energy, mood };
      if (photos.length > 0) metadata.photos = photos;
      try {
        if (existing) {
          await updateItem(existing.id, { body: body.trim(), metadata });
        } else {
          const today = new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          await captureItem({
            kind: "journal",
            title: today,
            body: body.trim(),
            status: "active",
            metadata,
          });
        }
        toast.success(existing ? "Updated" : "Saved");
      } catch {
        toast.error("Failed to save");
      }
    });
  }

  const tint = "var(--kind-journal)";
  return (
    <div className="life-card p-4 relative overflow-hidden">
      <div
        className="absolute -top-px left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
      />
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          <BookOpen size={11} style={{ color: tint }} />
          Journal
        </h2>
        {existing && (
          <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
            updated
          </span>
        )}
      </div>

      <div className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] mb-2">
        <Sparkles size={11} />
        {prompt}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => {
          const files: File[] = [];
          for (const item of e.clipboardData.items) {
            if (item.kind === "file") {
              const f = item.getAsFile();
              if (f) files.push(f);
            }
          }
          if (files.length > 0) {
            e.preventDefault();
            void uploadFiles(files);
          }
        }}
        rows={4}
        placeholder="Free-write. Paste a photo (⌘V) to add it. A paragraph or a single line — whatever lands."
        className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
      />

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {photos.map((id) => (
            <div
              key={id}
              className="relative group rounded-lg overflow-hidden border border-[var(--border-soft)]"
              style={{ width: 80, height: 80 }}
            >
              {existing ? (
                <Link href={`/items/${existing.id}`}>
                  <BlobImg id={id} className="w-full h-full object-cover" />
                </Link>
              ) : (
                <BlobImg id={id} className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removePhoto(id)}
                className="absolute top-1 right-1 grid place-items-center w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition"
                aria-label="Remove"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mt-3 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-faint)] uppercase tracking-wide">
            Energy
          </span>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="w-24 accent-[var(--accent)]"
          />
          <span className="text-xs text-[var(--text)] font-mono w-3">{energy}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-faint)] uppercase tracking-wide mr-1">
            Mood
          </span>
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`text-lg transition ${
                mood === m ? "opacity-100 scale-110" : "opacity-40 hover:opacity-80"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="ml-auto rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] inline-flex items-center gap-1.5 px-2 py-1.5 text-xs transition disabled:opacity-50"
          title="Attach photo"
        >
          <ImagePlus size={12} />
          Photo
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1.5 text-xs font-medium hover:brightness-110 transition disabled:opacity-50"
        >
          {existing ? "Update" : "Save"}
        </button>
      </div>
    </div>
  );
}
