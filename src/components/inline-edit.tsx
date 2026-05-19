"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Pencil, X, Check } from "lucide-react";

export function InlineTitle({
  id,
  value,
}: {
  id: string;
  value: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function save() {
    const trimmed = draft.trim();
    if (trimmed === (value ?? "")) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        toast.error("Couldn't save title");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex items-start gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          disabled={pending}
          className="flex-1 bg-transparent text-3xl font-semibold tracking-tight text-[var(--text)] focus:outline-none border-b border-[var(--accent)] pb-1"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group text-left -mx-1 px-1 rounded hover:bg-[var(--bg-card-hover)] transition"
    >
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)] leading-tight inline-flex items-baseline gap-2">
        {value ?? <em className="text-[var(--text-faint)]">untitled</em>}
        <Pencil
          size={14}
          className="text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition"
        />
      </h1>
    </button>
  );
}

export function InlineBody({
  id,
  value,
}: {
  id: string;
  value: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function save() {
    if (draft === (value ?? "")) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      if (!res.ok) {
        toast.error("Couldn't save body");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-2 text-xs text-[var(--text-faint)]">
          <span className="uppercase tracking-wide">Editing — markdown</span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
              className="inline-flex items-center gap-1 hover:text-[var(--text)] px-2 py-1"
            >
              <X size={11} />
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] text-zinc-950 px-2.5 py-1 font-medium hover:brightness-110 transition disabled:opacity-50"
            >
              <Check size={11} />
              Save
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          rows={12}
          className="w-full rounded-lg bg-[var(--bg-rail)] border border-[var(--border-strong)] p-4 text-sm font-mono text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
          placeholder="Markdown body. Use [[wiki links]] to connect items, ** for bold, > for quotes."
        />
        <div className="mt-1 text-[10px] text-[var(--text-faint)]">
          ⌘↵ to save · esc to cancel
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group w-full text-left mt-8 -mx-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition"
    >
      <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition">
        <Pencil size={11} />
        Click to edit
      </div>
      {value ? (
        <Markdown>{value}</Markdown>
      ) : (
        <p className="text-[var(--text-faint)] italic text-sm">
          Click to add notes, thoughts, links…
        </p>
      )}
    </button>
  );
}
