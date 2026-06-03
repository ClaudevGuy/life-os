"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, RefreshCw } from "lucide-react";
import { Portal } from "@/components/portal";
import { useAskChat, TurnView, AskSuggestions } from "@/components/ask-chat";

/**
 * Compact "Ask my notes" window. Opened from the top bar so you can ask
 * (or tell it to do something) without leaving the page you're on.
 */
export function AskPopover({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { turns, streaming, ask } = useAskChat();
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  if (!open) return null;

  function submit(question: string) {
    if (!question.trim() || streaming) return;
    setQ("");
    void ask(question);
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[11vh] px-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden flex flex-col max-h-[74vh]"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] shrink-0">
            <div className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[var(--ink)]">
              <Sparkles size={14} className="text-[var(--terra)]" />
              Ask my notes
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            >
              <X size={14} strokeWidth={1.6} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[140px]">
            {turns.length === 0 ? (
              <div>
                <p className="text-[12.5px] text-[var(--muted)] mb-3 leading-relaxed">
                  Ask about anything you&apos;ve saved — or tell it to{" "}
                  <span className="text-[var(--ink-2)]">add a reminder</span>,{" "}
                  <span className="text-[var(--ink-2)]">a person</span>, a note…
                </p>
                <AskSuggestions onPick={submit} compact />
              </div>
            ) : (
              turns.map((t, i) => (
                <div key={i} className="life-rise">
                  <TurnView turn={t} />
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            className="p-3 border-t border-[var(--line)] bg-[var(--paper-2)] shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
          >
            <div className="flex items-center gap-2 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] focus-within:border-[var(--terra)] px-3 h-10 transition">
              <Sparkles size={14} className="text-[var(--terra)] shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                disabled={streaming}
                placeholder="Ask or tell it to do something…"
                className="flex-1 bg-transparent text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none disabled:opacity-50"
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
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}
