"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Sparkles,
  RefreshCw,
  Lightbulb,
  Tag,
  Bookmark,
  Users,
  Target,
  ListTodo,
  Command,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { db } from "@/lib/store/db";
import { aiHeaders } from "@/lib/ai-key";

type Source = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
};
type Turn = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
};

type Suggestion = {
  category: string;
  question: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint: string;
};

const SUGGESTIONS: Suggestion[] = [
  {
    category: "Synthesise",
    question: "What have I been thinking about agent UX?",
    icon: Sparkles,
    tint: "var(--kind-idea)",
  },
  {
    category: "Decisions",
    question: "Which decisions are due for review?",
    icon: Lightbulb,
    tint: "var(--kind-decision)",
  },
  {
    category: "Tasks",
    question: "What's overdue or due today?",
    icon: ListTodo,
    tint: "var(--kind-task)",
  },
  {
    category: "People",
    question: "Who haven't I spoken to recently?",
    icon: Users,
    tint: "var(--kind-person)",
  },
  {
    category: "Browse",
    question: "Show me everything tagged design",
    icon: Tag,
    tint: "var(--kind-note)",
  },
  {
    category: "Goals",
    question: "How am I progressing on shipping Life OS v1?",
    icon: Target,
    tint: "var(--kind-goal)",
  },
];

export function AskClient() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function ask(question: string) {
    if (!question.trim() || streaming) return;
    setTurns((t) => [...t, { role: "user", text: question }]);
    setQ("");
    setStreaming(true);

    setTurns((t) => [...t, { role: "assistant", text: "", sources: [] }]);

    try {
      // Pick context locally: keyword match against the user's IndexedDB,
      // then fall back to "most recent 8" so the AI has something to chew on.
      const needle = question.toLowerCase();
      const all = await db.items.orderBy("capturedAt").reverse().toArray();
      let context = all
        .filter((i) => {
          const hay = [
            i.title,
            i.summary,
            i.body,
            i.topic,
            ...(i.keyPoints ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(needle);
        })
        .slice(0, 8);
      if (context.length === 0) context = all.slice(0, 8);

      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({
          question,
          items: context.map((i) => ({
            id: i.id,
            kind: i.kind,
            title: i.title,
            summary: i.summary,
            body: i.body?.slice(0, 1000) ?? null,
          })),
        }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => null);
        const fallback =
          detail?.error === "ai_unavailable"
            ? "AI key isn't set yet — but I found these saved items related to your question."
            : "Couldn't reach the AI service.";
        setTurns((t) => {
          const copy = [...t];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            last.text = fallback;
            last.sources = detail?.sources ?? [];
          }
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as
              | { type: "sources"; sources: Source[] }
              | { type: "text"; text: string };
            setTurns((t) => {
              const copy = [...t];
              const last = copy[copy.length - 1];
              if (!last || last.role !== "assistant") return copy;
              if (evt.type === "sources") last.sources = evt.sources;
              else last.text += evt.text;
              return copy;
            });
          } catch {
            // ignore
          }
        }
      }
    } catch {
      setTurns((t) => {
        const copy = [...t];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant")
          last.text = "Couldn't reach the AI service.";
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div>
      <div className="space-y-5 mb-32 min-h-[40vh]">
        {turns.length === 0 && <EmptyState onPick={ask} />}

        {turns.map((t, i) => (
          <div key={i} className="life-rise">
            {t.role === "user" ? (
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[var(--accent-glow)] border border-[var(--accent-soft)] px-4 py-2.5">
                <p className="text-sm text-[var(--text)]">{t.text}</p>
              </div>
            ) : (
              <div className="max-w-[95%]">
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
                  <Sparkles size={11} />
                  Life OS
                </div>
                {t.text ? (
                  <div className="text-[var(--text)]">
                    <Markdown>{t.text}</Markdown>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 text-sm text-[var(--text-faint)]">
                    <RefreshCw size={12} className="animate-spin" />
                    thinking…
                  </div>
                )}
                {t.sources && t.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.sources.map((s, j) => (
                      <Link
                        key={s.id}
                        href={`/items/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] transition"
                      >
                        <span className="text-[var(--accent)] tabular-nums">
                          [{j + 1}]
                        </span>
                        {s.title ?? "untitled"}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Prominent input pinned bottom */}
      <form
        className="fixed bottom-6 left-[15rem] right-6 z-20"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-center gap-2 rounded-2xl border bg-[var(--bg-card)] px-4 py-2.5"
            style={{
              borderColor: "var(--border-strong)",
              boxShadow:
                "0 24px 48px -16px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,102,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={streaming}
              placeholder="Ask anything about what you've saved…"
              className="flex-1 bg-transparent text-[15px] placeholder:text-[var(--text-faint)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !q.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1.5 text-sm font-medium hover:brightness-110 transition disabled:opacity-30 shadow-[0_4px_12px_rgba(212,168,102,0.25)]"
            >
              {streaming ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Ask
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] inline-flex items-center gap-1.5">
          <Sparkles size={11} />
          Try one of these to start
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 life-stagger">
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.question}
              type="button"
              onClick={() => onPick(s.question)}
              className="group text-left rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] transition"
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid place-items-center w-8 h-8 rounded-lg shrink-0 transition group-hover:scale-105"
                  style={{
                    background: `color-mix(in oklch, ${s.tint} 14%, transparent)`,
                    color: s.tint,
                  }}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[10px] uppercase tracking-[0.14em] font-medium"
                    style={{ color: s.tint }}
                  >
                    {s.category}
                  </div>
                  <div className="mt-1 text-sm text-[var(--text)] leading-snug">
                    {s.question}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-8 text-center text-[11px] text-[var(--text-faint)] inline-flex items-center gap-2 w-full justify-center">
        <Command size={11} />
        Or type anything below — the AI answers from your captures and cites sources
      </div>
    </div>
  );
}
