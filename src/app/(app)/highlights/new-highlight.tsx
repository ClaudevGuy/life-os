"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

export function NewHighlight() {
  const router = useRouter();
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
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "highlight",
          title: source.trim() || undefined,
          body: quote.trim(),
          metadata: topic.trim() ? { topic: topic.trim() } : {},
        }),
      });
      if (!res.ok) {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Highlight saved");
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] text-zinc-950 text-xs px-3 py-1.5 hover:brightness-110 transition"
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
            Save highlight
          </button>
        </div>
      </div>
    </div>
  );
}
