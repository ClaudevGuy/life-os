"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Check,
  ListTodo,
  Bell,
  Users,
  Lightbulb,
  NotebookPen,
  Coins,
  Wallet,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import {
  streamAsk,
  executeAction,
  type Source,
  type AppliedAction,
} from "@/lib/ask";

export type Turn = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
  actions?: AppliedAction[];
};

export function useAskChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);

  const ask = useCallback(
    async (question: string) => {
      const qq = question.trim();
      if (!qq) return;
      let busy = false;
      setStreaming((s) => {
        busy = s;
        return s;
      });
      if (busy) return;

      setTurns((t) => [
        ...t,
        { role: "user", text: qq },
        { role: "assistant", text: "", sources: [] },
      ]);
      setStreaming(true);

      const mutateLast = (fn: (t: Turn) => void) =>
        setTurns((t) => {
          const c = [...t];
          const last = c[c.length - 1];
          if (last?.role === "assistant") fn(last);
          return c;
        });

      const applied: AppliedAction[] = [];
      await streamAsk(qq, {
        onSources: (s) => mutateLast((l) => (l.sources = s)),
        onText: (d) => mutateLast((l) => (l.text += d)),
        onAction: async (a) => {
          const r = await executeAction(a);
          if (r) {
            applied.push(r);
            mutateLast((l) => (l.actions = [...applied]));
          }
        },
        onError: (m) =>
          mutateLast((l) => {
            l.text = l.text ? `${l.text}\n\n_${m}_` : m;
          }),
      });

      setStreaming(false);
    },
    [],
  );

  return { turns, streaming, ask };
}

export function TurnView({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[var(--accent-glow)] border border-[var(--accent-soft)] px-4 py-2.5">
        <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
          {turn.text}
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-[95%]">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
        <Sparkles size={11} />
        Life OS
      </div>
      {turn.text ? (
        <div className="text-[var(--text)]">
          <Markdown>{turn.text}</Markdown>
        </div>
      ) : turn.actions && turn.actions.length > 0 ? null : (
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-faint)]">
          <RefreshCw size={12} className="animate-spin" />
          thinking…
        </div>
      )}

      {turn.actions && turn.actions.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {turn.actions.map((a, i) => (
            <Link
              key={i}
              href={a.href}
              className="group inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm transition"
              style={{
                background: "color-mix(in oklch, var(--sage) 12%, transparent)",
                borderColor: "color-mix(in oklch, var(--sage) 28%, transparent)",
              }}
            >
              <Check
                size={14}
                strokeWidth={2.4}
                className="shrink-0"
                style={{ color: "var(--sage)" }}
              />
              <span className="font-medium text-[var(--text)]">{a.label}</span>
              {a.sub && (
                <span className="text-[var(--text-muted)] truncate">
                  — {a.sub}
                </span>
              )}
              <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition shrink-0">
                view →
              </span>
            </Link>
          ))}
        </div>
      )}

      {turn.sources && turn.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {turn.sources.map((s, j) => (
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
  );
}

type Suggestion = {
  category: string;
  question: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tint: string;
};

export const SUGGESTIONS: Suggestion[] = [
  {
    category: "Tasks",
    question: "What's overdue or due today?",
    icon: ListTodo,
    tint: "var(--terra)",
  },
  {
    category: "Recall",
    question: "What have I saved about my projects?",
    icon: Sparkles,
    tint: "var(--sky)",
  },
  {
    category: "Reminder",
    question: "Remind me tomorrow at 2pm to follow up with the warehouse",
    icon: Bell,
    tint: "var(--gold)",
  },
  {
    category: "People",
    question: "Add Henry to my people with phone 050-123-4567",
    icon: Users,
    tint: "var(--plum)",
  },
  {
    category: "Synthesize",
    question: "Summarize everything I captured this week",
    icon: Lightbulb,
    tint: "var(--sage)",
  },
  {
    category: "Note",
    question: "Make a note titled 'Launch checklist'",
    icon: NotebookPen,
    tint: "var(--accent)",
  },
  {
    category: "Holdings",
    question: "Add 0.5 BTC to my holdings",
    icon: Coins,
    tint: "var(--gold)",
  },
  {
    category: "Accounts",
    question: "Add a savings account at Chase with $5,000",
    icon: Wallet,
    tint: "var(--sage)",
  },
];

export function AskSuggestions({
  onPick,
  compact,
}: {
  onPick: (q: string) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-2.5 ${
        compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 gap-3"
      }`}
    >
      {(compact ? SUGGESTIONS.slice(0, 4) : SUGGESTIONS).map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.question}
            type="button"
            onClick={() => onPick(s.question)}
            className="group text-left rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3.5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)] transition"
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
                <div className="mt-1 text-[13px] text-[var(--text)] leading-snug">
                  {s.question}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
