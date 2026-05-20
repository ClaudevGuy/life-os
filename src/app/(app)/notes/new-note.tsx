"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, NotebookPen } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewNote() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setBody("");
    setOpen(false);
  }

  async function save() {
    if (!title.trim() && !body.trim()) {
      toast.error("Title or body required");
      return;
    }
    startTransition(async () => {
      let id: string | null = null;
      try {
        const item = await captureItem({
          kind: "note",
          title: title.trim() || null,
          body: body.trim() || null,
        });
        id = item.id;
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Note created");
      reset();
      if (id) router.push(`/items/${id}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-zinc-950 text-xs font-semibold uppercase tracking-[0.08em] px-4 py-1.5 shadow-[0_2px_8px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 hover:shadow-[0_2px_12px_var(--accent-glow)] active:translate-y-px transition"
      >
        <Plus size={12} strokeWidth={3} />
        New note
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-black/60 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-6 life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-sm font-medium mb-4">
          <NotebookPen size={14} className="text-[var(--accent)]" />
          New note
        </h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          autoFocus
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
          rows={8}
          placeholder="Write it down… markdown welcome. Use [[wiki links]] to connect items."
          className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-faint)]">⌘↵ to save</span>
          <div className="flex items-center gap-2">
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
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
