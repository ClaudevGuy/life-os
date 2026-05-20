"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, NotebookPen, CornerDownLeft } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function QuickNote() {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function save() {
    if (!title.trim() && !body.trim()) return;
    startTransition(async () => {
      try {
        await captureItem({
          kind: "note",
          title: title.trim() || null,
          body: body.trim() || null,
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Note saved");
      setTitle("");
      setBody("");
      setExpanded(false);
    });
  }

  function reset() {
    setTitle("");
    setBody("");
    setExpanded(false);
  }

  const dirty = title.trim() || body.trim();

  return (
    <div
      className={`life-card transition-all overflow-hidden ${
        expanded
          ? "border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-glow)]"
          : "focus-within:border-[var(--accent)]"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <NotebookPen
          size={14}
          className="text-[var(--text-faint)] shrink-0"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !expanded) {
              e.preventDefault();
              save();
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") reset();
          }}
          placeholder="Quick note… title here, press ↵ to save or click to add a body"
          className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-[var(--text-faint)] focus:outline-none"
        />
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition shrink-0 px-2"
          >
            + body
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-zinc-950 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] shadow-[0_2px_8px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 hover:shadow-[0_2px_12px_var(--accent-glow)] active:translate-y-px transition disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed shrink-0"
        >
          <Plus size={12} strokeWidth={3} />
          Add
        </button>
      </div>
      {expanded && (
        <>
          <div className="h-px bg-[var(--border-soft)] mx-3" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") reset();
            }}
            rows={4}
            placeholder="Body, context, links… markdown welcome, [[wiki]] to link items."
            className="w-full bg-transparent text-[13px] leading-relaxed placeholder:text-[var(--text-faint)] focus:outline-none resize-none px-3 py-2.5 text-[var(--text)]"
            autoFocus
          />
          <div className="px-3 py-2 border-t border-[var(--border-soft)] flex items-center justify-between text-[10px] text-[var(--text-faint)]">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="font-mono bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1.5 py-0.5 text-[var(--text-muted)]">
                ⌘
              </kbd>
              <kbd className="font-mono bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1 py-0.5 text-[var(--text-muted)]">
                <CornerDownLeft size={9} />
              </kbd>
              to save · esc to cancel
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
