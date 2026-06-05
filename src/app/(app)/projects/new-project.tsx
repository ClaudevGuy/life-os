"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Plus, FolderKanban } from "lucide-react";
import { captureItem } from "@/lib/store/items";
import { normalizeRepoUrl, parseRepo } from "@/lib/github";
import { RepoGlyph } from "@/components/repo-glyph";

export function NewProject() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [repo, setRepo] = useState("");
  const [pending, startTransition] = useTransition();

  const repoRef = useMemo(() => parseRepo(repo), [repo]);

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
    setRepo("");
    setOpen(false);
  }

  async function save() {
    if (!title.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        const m: Record<string, unknown> = {};
        if (area.trim()) m.area = area.trim();
        const repoUrl = normalizeRepoUrl(repo);
        if (repoUrl) m.repoUrl = repoUrl;
        await captureItem({
          kind: "project",
          title: title.trim(),
          metadata: Object.keys(m).length > 0 ? m : undefined,
        });
      } catch {
        toast.error("Couldn't create");
        return;
      }
      toast.success("Project created");
      reset();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New project
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
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
          New project
        </h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="Project name"
          autoFocus
          className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />

        <div className="mt-3 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          Group <span className="opacity-60 normal-case tracking-normal font-normal">(optional)</span>
        </div>
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="e.g. Work, Personal"
          className="mt-1.5 w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />

        <div className="mt-3 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          Repository <span className="opacity-60 normal-case tracking-normal font-normal">(optional)</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] focus-within:border-[var(--terra)] px-3 transition">
          <span
            className="shrink-0"
            style={{
              color: repoRef ? "var(--ink)" : "var(--muted-2)",
            }}
          >
            <RepoGlyph provider={repoRef?.provider ?? "github"} size={15} />
          </span>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            placeholder="github.com/owner/repo"
            className="flex-1 bg-transparent py-2 text-[13.5px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
          />
        </div>
        {repoRef && repoRef.owner && repoRef.repo && (
          <div className="mt-1.5 text-[11.5px] text-[var(--muted)] font-mono truncate">
            {repoRef.owner}
            <span className="text-[var(--muted-2)]"> / </span>
            <span className="text-[var(--ink-2)] font-medium">
              {repoRef.repo}
            </span>
          </div>
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
          </div>,
          document.body,
        )}
    </>
  );
}
