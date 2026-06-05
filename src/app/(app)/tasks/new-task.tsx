"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Calendar, AlignLeft } from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { captureItem } from "@/lib/store/items";
import { PrioritySelect } from "@/components/priority-select";

type Priority = "low" | "medium" | "high";

export function NewTask() {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [expanded, setExpanded] = useState(false);

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
        await captureItem({
          kind: "task",
          title: finalTitle,
          body: notes.trim() || null,
          metadata,
        });
      } catch {
        toast.error("Couldn't save");
        return;
      }
      setTitle("");
      setNotes("");
      setExpanded(false);
    });
  }

  return (
    <div className="life-card px-4 py-3 focus-within:border-[var(--terra)] transition">
      <div className="flex items-center gap-3">
        <Plus size={16} strokeWidth={1.6} className="text-[var(--muted-2)] shrink-0" />
        <div className="flex-1 min-w-0">
          <input
            value={title}
            onFocus={() => setExpanded(true)}
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
        <div className="hidden sm:block">
          <PrioritySelect value={priority} onChange={setPriority} />
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

      {expanded && (
        <div className="mt-2.5 pl-7 flex items-start gap-2">
          <AlignLeft size={14} className="text-[var(--muted-2)] shrink-0 mt-1.5" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            rows={2}
            placeholder="Add context… (optional)"
            className="flex-1 bg-transparent text-[13px] leading-relaxed text-[var(--ink-2)] placeholder:text-[var(--muted-2)] focus:outline-none resize-none"
          />
        </div>
      )}
    </div>
  );
}
