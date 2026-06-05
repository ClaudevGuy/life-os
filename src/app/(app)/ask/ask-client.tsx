"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Send, Sparkles, RefreshCw, Wand2 } from "lucide-react";
import {
  useAskChat,
  TurnView,
  AskSuggestions,
} from "@/components/ask-chat";
import { aiKeyState } from "@/lib/ai-key";

export function AskClient() {
  const { turns, streaming, ask } = useAskChat();
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function submit(question: string) {
    if (!question.trim() || streaming) return;
    if (aiKeyState() === "sealed") {
      toast.error("Unlock your vault to use AI (Settings → AI).");
      return;
    }
    setQ("");
    void ask(question);
  }

  return (
    <div>
      <div className="space-y-5 mb-32 min-h-[40vh]">
        {turns.length === 0 && (
          <div>
            <div className="text-center mb-6">
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] inline-flex items-center gap-1.5">
                <Sparkles size={11} />
                Ask, or tell it to do something
              </div>
            </div>
            <AskSuggestions onPick={submit} />
            <div className="mt-8 text-center text-[11px] text-[var(--text-faint)] inline-flex items-center gap-2 w-full justify-center">
              <Wand2 size={11} />
              It answers from your captures with sources — and can add reminders,
              tasks, people, notes and bookmarks when you ask.
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="life-rise">
            <TurnView turn={t} />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Prominent input pinned bottom */}
      <form
        className="fixed bottom-6 left-[15rem] right-6 z-20"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
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
              placeholder="Ask anything, or tell it to add something…"
              className="flex-1 bg-transparent text-[15px] placeholder:text-[var(--text-faint)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !q.trim()}
              className="life-btn life-btn-sm life-btn-primary"
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
