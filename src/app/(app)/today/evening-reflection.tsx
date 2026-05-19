"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Moon, Check } from "lucide-react";

const PROMPTS = [
  "What's one thing that went well today?",
  "What's one thing you'd redo?",
  "Who deserves a thank-you?",
  "What did you learn?",
  "What are you proud of?",
  "What surprised you?",
  "Where did your energy go?",
];

export function EveningReflection() {
  const router = useRouter();
  const [hour, setHour] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [promptIdx] = useState(() => {
    const day = new Date().getDate();
    return day % PROMPTS.length;
  });

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  // Only show in the evening
  if (hour === null || hour < 17) return null;

  function save() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "journal",
          title: `Evening — ${PROMPTS[promptIdx]}`,
          body: text.trim(),
          metadata: { eveningReflection: true },
        }),
      });
      if (!res.ok) {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Saved");
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="life-card p-4">
      <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-2">
        <Moon size={11} className="text-[var(--accent)]" />
        Evening reflection
      </div>
      {saved ? (
        <div className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
          <Check size={12} /> Captured — sleep well.
        </div>
      ) : (
        <>
          <p className="text-sm text-[var(--text)]">{PROMPTS[promptIdx]}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            rows={2}
            placeholder="A sentence is enough…"
            className="mt-2 w-full rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={pending || !text.trim()}
              className="rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1 text-xs font-medium hover:brightness-110 transition disabled:opacity-30"
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
}
