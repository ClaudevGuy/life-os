"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { StoredItem as Item } from "@/lib/store/items";
import { Sparkles, ImagePlus, X } from "lucide-react";
import { captureItem, updateItem } from "@/lib/store/items";
import { saveBlob, deleteBlob } from "@/lib/store/blobs";
import { BlobImg } from "@/components/blob-img";

// Energy 1..5 → matching mood emoji. Existing entries that used the old emoji
// picker still resolve to the right level via this lookup.
const MOOD_BY_ENERGY: Record<number, string> = {
  1: "😫",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😄",
};
const ENERGY_BY_MOOD: Record<string, number> = {
  "😫": 1,
  "😕": 2,
  "😐": 3,
  "🙂": 4,
  "😄": 5,
};
const SCALE_COLORS: Record<number, string> = {
  1: "var(--muted-2)",
  2: "var(--gold)",
  3: "var(--terra)",
  4: "var(--plum)",
  5: "var(--sky)",
};

const PROMPTS: string[] = [
  "Sunday — what do you want this week to feel like?",
  "Monday — what's one move that will matter most this week?",
  "Tuesday — what's still on your mind from yesterday?",
  "Wednesday — midweek check-in. Are you spending energy on what matters?",
  "Thursday — what would make tomorrow great?",
  "Friday — what shipped, what slipped, what surprised you?",
  "Saturday — what do you want to remember about today?",
  "What surprised you in the last 24 hours?",
  "What's one decision you're avoiding?",
  "Who deserves a thank-you note this week?",
  "What did you say no to that felt right?",
  "Where did your attention go that you regret?",
  "What's the smallest next step?",
  "What would 'enough' look like today?",
];

function defaultPromptIndex() {
  return new Date().getDay();
}

export function JournalForm({ existing }: { existing: Item | null }) {
  const [pending, startTransition] = useTransition();
  const existingMeta = (existing?.metadata ?? {}) as {
    energy?: number;
    mood?: string;
    photos?: string[];
  };

  const [body, setBody] = useState(existing?.body ?? "");
  const initialEnergy =
    existingMeta.energy ??
    (existingMeta.mood ? ENERGY_BY_MOOD[existingMeta.mood] : undefined) ??
    3;
  const [energy, setEnergy] = useState<number>(initialEnergy);
  const [photos, setPhotos] = useState<string[]>(existingMeta.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [promptIdx, setPromptIdx] = useState<number>(defaultPromptIndex());
  const [savedAt, setSavedAt] = useState<number | null>(
    existing ? new Date(existing.capturedAt).getTime() : null,
  );
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
      toast.success(
        `${newIds.length} photo${newIds.length === 1 ? "" : "s"} added`,
      );
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

  // Autosave: debounce body+energy edits and persist silently.
  useEffect(() => {
    if (!body.trim() && !existing) return;
    const t = setTimeout(() => {
      void persist({ silent: true });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, energy]);

  async function persist({ silent }: { silent: boolean }) {
    if (!body.trim()) {
      if (!silent) toast.error("Write something first");
      return;
    }
    const mood = MOOD_BY_ENERGY[energy] ?? "🙂";
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
      setSavedAt(Date.now());
      if (!silent) toast.success(existing ? "Updated" : "Saved");
    } catch {
      if (!silent) toast.error("Failed to save");
    }
  }

  function save() {
    startTransition(() => persist({ silent: false }));
  }

  function cyclePrompt() {
    setPromptIdx((i) => (i + 1) % PROMPTS.length);
  }

  const prompt = useMemo(() => PROMPTS[promptIdx], [promptIdx]);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const charCount = body.length;
  const savedLabel =
    savedAt && body.trim() ? "autosaving" : body.trim() ? "unsaved" : "draft";

  return (
    <div className="life-card p-5 sm:p-6 relative">
      {/* Header row: date + 5-circle scale */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-none">
          {dateLabel}
        </h2>
        <div className="flex items-center gap-2" role="group" aria-label="Energy">
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = energy === n;
            const color = SCALE_COLORS[n];
            return (
              <button
                key={n}
                type="button"
                onClick={() => setEnergy(n)}
                title={`Energy ${n}/5 — ${MOOD_BY_ENERGY[n]}`}
                aria-label={`Set energy to ${n}`}
                className="grid place-items-center w-[26px] h-[26px] rounded-full transition"
                style={{
                  border: `1.6px solid ${color}`,
                  background: selected ? color : "transparent",
                  boxShadow: selected
                    ? `0 0 0 3px color-mix(in oklch, ${color} 22%, transparent)`
                    : "none",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Prompt */}
      <button
        type="button"
        onClick={cyclePrompt}
        title="New prompt"
        className="mt-2 inline-flex items-center gap-1.5 text-[13px] italic text-[var(--terra)] hover:text-[var(--ink)] transition"
      >
        <Sparkles size={13} strokeWidth={1.6} />
        {prompt}
      </button>

      {/* Body */}
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
        rows={9}
        placeholder="Begin anywhere. The page doesn't mind."
        className="mt-4 w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-4 py-3 text-[14px] leading-relaxed placeholder:text-[var(--muted-2)] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] focus:bg-[var(--paper)] resize-y transition"
      />

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {photos.map((id) => (
            <div
              key={id}
              className="relative group rounded-lg overflow-hidden border border-[var(--line)]"
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

      {/* Bottom row */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] text-[var(--muted)] tabular-nums">
          {charCount} chars · {savedLabel}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="life-btn life-btn-sm life-btn-ghost"
            title="Attach photo"
          >
            <ImagePlus size={12} strokeWidth={1.6} />
            Photo
          </button>
          <button
            type="button"
            onClick={cyclePrompt}
            className="life-btn life-btn-sm life-btn-secondary"
          >
            <Sparkles size={12} strokeWidth={1.6} />
            Prompt me
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="life-btn life-btn-sm"
            style={{
              background: "var(--ink)",
              color: "var(--paper)",
              borderColor: "var(--ink)",
            }}
          >
            {existing ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
