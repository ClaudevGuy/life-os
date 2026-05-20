"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Calendar } from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { captureItem } from "@/lib/store/items";

type Priority = "low" | "medium" | "high";

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "var(--sage)",
  medium: "var(--gold)",
  high: "var(--terra)",
};

export function NewTask() {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

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
    <div className="life-card flex items-center gap-3 px-4 py-3 focus-within:border-[var(--terra)] transition">
      <Plus
        size={16}
        strokeWidth={1.6}
        className="text-[var(--muted-2)] shrink-0"
      />
      <div className="flex-1 min-w-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="Add a task… try 'review proposal friday'"
          className="w-full bg-transparent text-[14.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
        />
        {parsed && (
          <div className="mt-1 inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--terra)]">
            <Calendar size={11} strokeWidth={1.6} />
            due {dateLabel(parsed.date)}
            <span className="text-[var(--muted-2)] normal-case tracking-normal font-normal">
              · parsed “{parsed.phrase}”
            </span>
          </div>
        )}
      </div>
      <div className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[var(--paper-2)] border border-[var(--line)] p-1">
        {(["low", "medium", "high"] as const).map((p) => {
          const active = priority === p;
          const dot = PRIORITY_COLORS[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full transition ${
                active
                  ? "bg-[var(--paper)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              style={
                active
                  ? { boxShadow: "var(--shadow-1)" }
                  : undefined
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: dot }}
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
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        Add
      </button>
    </div>
  );
}
