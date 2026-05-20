"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Pencil, X, Check } from "lucide-react";
import { updateItem } from "@/lib/store/items";

export function InlineTitle({
  id,
  value,
}: {
  id: string;
  value: string | null;
}) {
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
      try {
        await updateItem(id, { title: trimmed });
        setEditing(false);
      } catch {
        toast.error("Couldn't save title");
      }
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
      className="group text-left -mx-2 px-2 py-1 rounded-md hover:bg-[var(--bg-card-hover)] transition"
    >
      <h1 className="text-[34px] font-bold tracking-tight text-[var(--text)] leading-[1.15] inline-flex items-baseline gap-3">
        {value ?? <em className="text-[var(--text-faint)] font-normal">Untitled</em>}
        <Pencil
          size={15}
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
      try {
        await updateItem(id, { body: draft });
        setEditing(false);
      } catch {
        toast.error("Couldn't save body");
      }
    });
  }

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2 text-[11px] text-[var(--text-faint)]">
          <span className="uppercase tracking-[0.14em]">Editing · markdown</span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(false);
              }}
              className="life-btn life-btn-sm life-btn-ghost"
            >
              <X size={11} />
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="life-btn life-btn-sm life-btn-primary"
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
        <div className="mt-1.5 text-[10px] text-[var(--text-faint)]">
          ⌘↵ to save · esc to cancel
        </div>
      </div>
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group w-full rounded-xl border border-dashed border-[var(--border-soft)] hover:border-[var(--accent)] hover:bg-[var(--accent-glow)] transition px-5 py-6 text-left"
      >
        <div className="inline-flex items-center gap-2 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition">
          <span className="grid place-items-center w-7 h-7 rounded-full border border-[var(--border-soft)] group-hover:border-[var(--accent)] transition">
            <Pencil size={12} />
          </span>
          <span className="text-sm">Add notes, thoughts, links…</span>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-faint)] pl-9">
          Markdown welcome. Use <code className="text-[var(--accent)]">[[wiki links]]</code> to connect items.
        </p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group w-full text-left -mx-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition"
    >
      <div className="flex items-center gap-2 mb-2 text-[11px] text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition">
        <Pencil size={11} />
        Click to edit
      </div>
      <Markdown>{value}</Markdown>
    </button>
  );
}
