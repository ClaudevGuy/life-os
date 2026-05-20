"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, FolderKanban } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewProject() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"project" | "area">("project");
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") reset();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setTitle("");
    setArea("");
    setOpen(false);
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind,
          title: title.trim(),
          metadata:
            kind === "project" && area.trim()
              ? { area: area.trim() }
              : undefined,
        });
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
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New project
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/40 backdrop-blur-sm"
      onClick={reset}
    >
      <div
        className="w-full max-w-sm rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] p-6 life-rise"
        style={{ boxShadow: "var(--shadow-3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold mb-4 text-[var(--ink)]">
          <FolderKanban
            size={15}
            strokeWidth={1.6}
            className="text-[var(--terra)]"
          />
          New project or area
        </h2>

        <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] mb-3">
          {(["project", "area"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-[12.5px] capitalize px-3 py-1 rounded-[7px] font-medium transition ${
                kind === k
                  ? "bg-[var(--paper)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              style={kind === k ? { boxShadow: "var(--shadow-1)" } : undefined}
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
          className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />

        {kind === "project" && (
          <>
            <div className="mt-3 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
              Area <span className="opacity-60 normal-case tracking-normal font-normal">(optional)</span>
            </div>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
              placeholder="e.g. Work, Life"
              className="mt-1.5 w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            />
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
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
