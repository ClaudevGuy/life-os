"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark, X, ExternalLink, Trash2 } from "lucide-react";
import { updateItem, deleteItem, type StoredItem } from "@/lib/store/items";
import { Portal } from "@/components/portal";
import { detectPlatform, normalizeUrl, platformInitial } from "@/lib/bookmarks";

export function EditBookmarkModal({
  existing,
  onClose,
}: {
  existing: StoredItem;
  onClose: () => void;
}) {
  const meta = (existing.metadata ?? {}) as { url?: string; tags?: string[] };
  const [title, setTitle] = useState(existing.title ?? "");
  const [url, setUrl] = useState(meta.url ?? "");
  const [description, setDescription] = useState(existing.body ?? "");
  const [tags, setTags] = useState((meta.tags ?? []).join(", "));
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const platform = useMemo(() => {
    const normalized = normalizeUrl(url);
    return normalized ? detectPlatform(normalized) : null;
  }, [url]);

  function save() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      toast.error("Enter a valid URL");
      return;
    }
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    const detected = detectPlatform(normalized);
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        await updateItem(existing.id, {
          title: title.trim(),
          body: description.trim() || null,
          sourceUrl: normalized,
          metadata: {
            ...meta,
            url: normalized,
            platform: detected.name,
            host: detected.host,
            color: detected.color,
            tags: tagList,
          },
        });
        toast.success("Updated");
        onClose();
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  function remove() {
    if (!confirm(`Delete this bookmark? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteItem(existing.id);
        toast.success("Deleted");
        onClose();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — platform-colored monogram tile */}
          <div className="p-5 pb-3 flex items-start gap-3 border-b border-[var(--line)]">
            <div
              className="grid place-items-center w-10 h-10 rounded-[10px] text-[14px] font-semibold tracking-[-0.01em] shrink-0 transition-colors"
              style={{
                background: platform
                  ? `color-mix(in oklch, ${platform.color} 14%, transparent)`
                  : "var(--paper-2)",
                color: platform?.color ?? "var(--muted)",
                border: `1px solid ${
                  platform
                    ? `color-mix(in oklch, ${platform.color} 30%, transparent)`
                    : "var(--line)"
                }`,
              }}
            >
              {platform ? (
                platformInitial(platform.name)
              ) : (
                <Bookmark size={15} strokeWidth={1.6} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {platform ? platform.name : "Edit bookmark"}
              </div>
              <div className="mt-0.5 text-[16px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
                {title.trim() || "Untitled"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
            >
              <X size={14} strokeWidth={1.6} />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4">
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is it?"
                autoFocus
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>

            <Field label="URL">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                type="url"
                placeholder="https://…"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
              {platform && (
                <a
                  href={normalizeUrl(url) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[var(--muted)] hover:text-[var(--terra)] transition"
                >
                  Open {platform.host} <ExternalLink size={10} strokeWidth={1.6} />
                </a>
              )}
            </Field>

            <Field
              label={
                <>
                  Description{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (optional)
                  </span>
                </>
              }
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Why you saved it"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] resize-y transition leading-relaxed"
              />
            </Field>

            <Field
              label={
                <>
                  Tags{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (comma-separated)
                  </span>
                </>
              }
            >
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="design, inspiration"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-2)] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--bad)] transition"
            >
              <Trash2 size={12} strokeWidth={1.6} />
              Delete
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="life-btn life-btn-sm life-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="life-btn life-btn-sm life-btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}
