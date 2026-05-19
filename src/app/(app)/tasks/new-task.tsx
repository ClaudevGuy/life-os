"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Calendar } from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";

export function NewTask() {
  const router = useRouter();
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
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "task",
          title: finalTitle,
          metadata,
        }),
      });
      if (!res.ok) {
        toast.error("Couldn't save");
        return;
      }
      setTitle("");
      router.refresh();
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
      <div className="hidden sm:flex items-center gap-0.5 rounded-md bg-[var(--bg-rail)] p-0.5">
        {(["low", "medium", "high"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded transition ${
              priority === p
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending || !cleanTitle}
        className="rounded-md bg-[var(--accent)] text-zinc-950 px-2.5 py-1 text-xs font-medium hover:brightness-110 transition disabled:opacity-30"
      >
        Add
      </button>
    </div>
  );
}
