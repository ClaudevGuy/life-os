"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Lightbulb } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewDecision() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reviewAt, setReviewAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setBody("");
    setOpen(false);
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "decision",
          title: title.trim(),
          body: body.trim() || null,
          metadata: {
            reviewAt: new Date(`${reviewAt}T09:00:00`).toISOString(),
            outcome: "pending",
          },
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Decision logged");
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] text-zinc-950 text-xs px-3 py-1.5 hover:brightness-110 transition"
      >
        <Plus size={12} /> New decision
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-black/60 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-6 life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-sm font-medium mb-4">
          <Lightbulb size={14} className="text-[var(--accent)]" />
          New decision
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you deciding?"
          autoFocus
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Reasoning, alternatives considered, how you'll know it was right…"
          className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            Review on
            <input
              type="date"
              value={reviewAt}
              onChange={(e) => setReviewAt(e.target.value)}
              className="rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] px-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1.5 text-xs font-medium hover:brightness-110 transition disabled:opacity-50"
            >
              Log decision
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
