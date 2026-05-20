"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Calendar } from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { captureItem } from "@/lib/store/items";

export function NewTask() {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const parsed = useMemo(() => parseNaturalDate(title), [title]);
  const cleanTitle = parsed ? parsed.title : title.trim();

  async function save() {
    const finalTitle = cleanTitle;
    if (!finalTitle) return;
    startTransition(async () => {
      const metadata: Record<string, unknown> = {
        priority,
        completedAt: null,
      };
      if (parsed) metadata.dueDate = parsed.date.toISOString();
      try {
        await captureItem({ kind: "task", title: finalTitle, metadata });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      setTitle("");
    });
  }

  return (
    <div className="life-card flex items-center gap-2 px-3 py-2 focus-within:border-[var(--accent)] transition">
      <Plus size={14} className="text-[var(--text-faint)] shrink-0" />
      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="Add a task… try 'review proposal friday'"
          className="w-full bg-transparent text-sm placeholder:text-[var(--text-faint)] focus:outline-none"
        />
        {parsed && (
          <div className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--accent)]">
            <Calendar size={10} />
            due {dateLabel(parsed.date)}
            <span className="text-[var(--text-faint)]">· parsed “{parsed.phrase}”</span>
          </div>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-1 rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)] p-1">
        {(["low", "medium", "high"] as const).map((p) => {
          const active = priority === p;
          const dot =
            p === "high" ? "#ef8b8b" : p === "medium" ? "var(--accent)" : "#6dc8a1";
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-medium px-2.5 py-1 rounded-full transition ${
                active
                  ? "bg-[var(--bg-card)] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.3)]"
                  : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full transition"
                style={{
                  background: dot,
                  boxShadow: active ? `0 0 6px ${dot}` : "none",
                  opacity: active ? 1 : 0.5,
                }}
              />
              {p}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending || !cleanTitle}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-zinc-950 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] shadow-[0_2px_8px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 hover:shadow-[0_2px_12px_var(--accent-glow)] active:translate-y-px transition disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed"
      >
        <Plus size={12} strokeWidth={3} />
        Add
      </button>
    </div>
  );
}
