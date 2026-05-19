"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function QuickDecision() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reviewAt, setReviewAt] = useState<string>(() => {
    // default: 2 weeks out
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  function reset() {
    setTitle("");
    setBody("");
    setOpen(false);
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          reviewAt,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to save");
        return;
      }
      toast.success("Decision logged");
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-zinc-900 hover:border-zinc-800 text-sm text-zinc-500 hover:text-zinc-300 p-3 transition inline-flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Log a decision
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-4">
      <h2 className="text-sm font-medium tracking-tight mb-3">New decision</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you deciding?"
        className="w-full rounded-md bg-zinc-950 border border-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Reasoning, alternatives considered…"
        className="mt-2 w-full rounded-md bg-zinc-950 border border-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <label className="text-xs text-zinc-500 flex items-center gap-2">
          Review on
          <input
            type="date"
            value={reviewAt}
            onChange={(e) => setReviewAt(e.target.value)}
            className="rounded-md bg-zinc-950 border border-zinc-900 px-2 py-1 text-xs"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-zinc-100 text-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-white transition disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
