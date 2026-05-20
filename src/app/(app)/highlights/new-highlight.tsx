"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewHighlight() {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [source, setSource] = useState("");
  const [topic, setTopic] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setQuote("");
    setSource("");
    setTopic("");
    setOpen(false);
  }

  async function save() {
    if (!quote.trim()) {
      toast.error("Quote required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "highlight",
          title: source.trim() || null,
          body: quote.trim(),
          topic: topic.trim() || null,
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Highlight saved");
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-primary"
      >
        <Plus size={12} /> New highlight
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
          <Sparkles size={14} className="text-[var(--accent)]" />
          New highlight
        </h2>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={4}
          placeholder="Paste the line worth remembering…"
          autoFocus
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none italic"
        />
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Source (book title, article, person)"
          className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic / tag (optional)"
          className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
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
            Save highlight
          </button>
        </div>
      </div>
    </div>
  );
}
