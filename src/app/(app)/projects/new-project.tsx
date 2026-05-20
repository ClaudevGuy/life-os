"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewProject() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"project" | "area">("project");
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setOpen(false);
  }

  async function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        await captureItem({ kind, title: title.trim() });
      } catch {
        toast.error("Couldn't create");
        return;
      }
      toast.success(`${kind === "project" ? "Project" : "Area"} created`);
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
        <Plus size={12} strokeWidth={3} />
        New
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)] p-5 life-rise">
        <h2 className="text-sm font-medium mb-4">New project or area</h2>

        <div className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-rail)] p-0.5 mb-3">
          {(["project", "area"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-xs capitalize px-3 py-1 rounded transition ${
                kind === k
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder={kind === "project" ? "Project name" : "Area of life"}
          autoFocus
          className="w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
