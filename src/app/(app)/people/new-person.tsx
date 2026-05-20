"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewPersonButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  function reset() {
    setName("");
    setHandle("");
    setOpen(false);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "person",
          title: name.trim(),
          status: "active",
          metadata: { handle: handle.trim() || undefined },
        });
      } catch {
        toast.error("Failed");
        return;
      }
      toast.success("Added");
      reset();
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
        Add person
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-5 life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-sm font-medium mb-4">
          <Users size={14} className="text-[var(--accent)]" />
          Add person
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          autoFocus
        />
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Handle (optional, e.g. @daniel)"
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
