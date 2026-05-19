"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Repeat } from "lucide-react";
import type { Item } from "@/db/schema";
import { useRouter } from "next/navigation";

export function TaskRow({
  task,
  done,
  compact,
  indent,
}: {
  task: Item;
  done?: boolean;
  compact?: boolean;
  indent?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(Boolean(done));
  const burstRef = useRef<HTMLSpanElement>(null);

  const meta = (task.metadata ?? {}) as {
    dueDate?: string | null;
    priority?: string | null;
    completedAt?: string | null;
    recurrence?: string | null;
  };

  const due = meta.dueDate ? new Date(meta.dueDate) : null;
  const overdue = !isDone && due && due < new Date();

  function fireConfetti() {
    const el = burstRef.current;
    if (!el) return;
    el.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("span");
      const angle = (Math.PI * 2 * i) / 8;
      const dist = 24 + Math.random() * 12;
      s.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      s.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
      const hues = ["#d4a866", "#f1c27d", "#6dc8a1", "#e57f9f", "#6aa9ef"];
      s.style.background = hues[i % hues.length];
      el.appendChild(s);
    }
    setTimeout(() => {
      if (el) el.innerHTML = "";
    }, 700);
  }

  function toggle() {
    const next = !isDone;
    setIsDone(next);
    if (next) fireConfetti();
    startTransition(async () => {
      await fetch(`/api/tasks/${task.id}/toggle`, { method: "POST" }).catch(() => {});
      router.refresh();
    });
  }

  const padding = compact ? "px-3.5 py-2" : "px-4 py-2.5";
  const indentClass = indent ? "pl-10" : "";

  return (
    <li
      className={`flex items-start gap-3 group ${padding} ${indentClass} hover:bg-[var(--bg-card-hover)] transition`}
    >
      {indent && (
        <span className="absolute -ml-5 mt-1.5 w-2 border-t border-[var(--border-strong)]" />
      )}
      <div className="relative mt-0.5">
        <span ref={burstRef} className="life-confetti pointer-events-none absolute inset-0" />
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`relative grid place-items-center w-4 h-4 rounded border transition ${
            isDone
              ? "bg-[var(--accent)] border-[var(--accent)] text-zinc-950"
              : "border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]"
          }`}
        >
          {isDone && <Check size={11} strokeWidth={3} />}
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[13px] leading-tight transition ${
            isDone ? "text-[var(--text-faint)] line-through" : "text-[var(--text)]"
          }`}
        >
          {task.title ?? "untitled"}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {meta.recurrence && !isDone && (
          <span
            title={`Recurs ${meta.recurrence}`}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--accent)]"
          >
            <Repeat size={10} />
            {meta.recurrence}
          </span>
        )}
        {meta.priority && !isDone && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background:
                meta.priority === "high"
                  ? "#ef8b8b"
                  : meta.priority === "medium"
                  ? "var(--accent)"
                  : "#6dc8a1",
            }}
          />
        )}
        {due && !isDone && (
          <span
            className={`text-[11px] tabular-nums ${
              overdue ? "text-[#ef8b8b]" : "text-[var(--text-faint)]"
            }`}
          >
            {overdue ? "overdue" : ""}{" "}
            {due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        {isDone && meta.completedAt && (
          <span className="text-[11px] text-[var(--text-faint)]">
            {relTime(new Date(meta.completedAt))}
          </span>
        )}
      </div>
    </li>
  );
}

function relTime(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) {
    const h = Math.floor(diff / 3_600_000);
    return h === 0 ? "just now" : `${h}h ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
