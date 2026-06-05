"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Mic,
  Square,
  Sparkles,
  X,
  NotebookPen,
  ListTodo,
  Loader2,
  Check,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Portal } from "@/components/portal";
import { captureItem } from "@/lib/store/items";
import { streamAsk, executeAction, type AppliedAction } from "@/lib/ask";
import { useSpeechRecognition } from "@/lib/use-speech";

export function VoiceButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Voice capture"
        aria-label="Voice capture"
        className="focus-hide grid place-items-center w-[30px] h-[30px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:text-[var(--terra)] hover:border-[var(--terra)] transition"
      >
        <Mic size={15} strokeWidth={1.7} />
      </button>
      {open && <VoiceModal onClose={() => setOpen(false)} />}
    </>
  );
}

function firstLine(t: string): string {
  return t.split("\n")[0].slice(0, 120);
}
function restLines(t: string): string | null {
  const r = t.split("\n").slice(1).join("\n").trim();
  return r || null;
}

function VoiceModal({ onClose }: { onClose: () => void }) {
  const sr = useSpeechRecognition();
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<AppliedAction[] | null>(null);

  // Auto-start listening when supported.
  useEffect(() => {
    if (sr.supported) {
      sr.reset();
      sr.start();
    }
    return () => sr.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const text = sr.transcript.trim();
  const canAct = text.length > 0 && !busy;

  async function captureSmart() {
    sr.stop();
    if (!text) return;
    setBusy(true);
    const out: AppliedAction[] = [];
    let errored = false;
    await streamAsk(text, {
      onAction: async (a) => {
        const r = await executeAction(a);
        if (r) out.push(r);
      },
      onError: () => {
        errored = true;
      },
    });
    if (out.length > 0) {
      setApplied(out);
      setBusy(false);
      return;
    }
    // Nothing actioned (or no AI key) — keep it as a note so it's never lost.
    await captureItem({
      kind: "note",
      title: firstLine(text),
      body: restLines(text),
      status: "inbox",
    });
    setBusy(false);
    toast.success(errored ? "No AI key — saved as a note" : "Saved as a note");
    onClose();
  }

  async function saveNote() {
    sr.stop();
    if (!text) return;
    setBusy(true);
    await captureItem({
      kind: "note",
      title: firstLine(text),
      body: restLines(text),
      status: "inbox",
    });
    toast.success("Note saved");
    onClose();
  }

  async function saveTask() {
    sr.stop();
    if (!text) return;
    setBusy(true);
    await captureItem({
      kind: "task",
      title: text.slice(0, 160),
      status: "inbox",
      metadata: { priority: "medium", completedAt: null },
    });
    toast.success("Task added");
    onClose();
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[18px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 pb-3 flex items-center justify-between border-b border-[var(--line)]">
            <h2 className="text-[14px] font-semibold text-[var(--ink)] inline-flex items-center gap-2">
              <Mic size={15} className="text-[var(--terra)]" />
              Voice capture
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <X size={14} />
            </button>
          </div>

          {applied ? (
            <div className="p-6">
              <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3">
                Captured
              </div>
              <ul className="space-y-2">
                {applied.map((a, i) => (
                  <li key={i}>
                    <Link
                      href={a.href}
                      onClick={onClose}
                      className="flex items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 hover:border-[var(--terra)] transition"
                    >
                      <span className="grid place-items-center w-6 h-6 rounded-full bg-[var(--sage-tint)] text-[var(--sage)] shrink-0">
                        <Check size={13} strokeWidth={2.5} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-medium text-[var(--ink)]">
                          {a.label}
                        </div>
                        {a.sub && (
                          <div className="text-[12px] text-[var(--muted)] truncate">
                            {a.sub}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={14} className="text-[var(--muted-2)] shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onClose}
                className="life-btn life-btn-sm life-btn-primary w-full justify-center mt-4"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="p-6">
              {!sr.supported ? (
                <p className="text-[13px] text-[var(--muted)] text-center mb-4">
                  Your browser doesn&apos;t support live voice capture. Type your
                  thought below instead.
                </p>
              ) : (
                <div className="flex flex-col items-center mb-4">
                  <button
                    type="button"
                    onClick={() => (sr.listening ? sr.stop() : sr.start())}
                    className="relative grid place-items-center w-20 h-20 rounded-full transition active:scale-95"
                    style={{
                      background: sr.listening
                        ? "var(--terra)"
                        : "color-mix(in oklch, var(--terra) 14%, transparent)",
                      color: sr.listening ? "#fff" : "var(--terra)",
                    }}
                    aria-label={sr.listening ? "Stop" : "Start"}
                  >
                    {sr.listening && (
                      <>
                        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "var(--terra)", opacity: 0.25 }} />
                        <span className="absolute -inset-2 rounded-full border border-[var(--terra)]/30 animate-pulse" />
                      </>
                    )}
                    {sr.listening ? (
                      <Square size={26} fill="currentColor" />
                    ) : (
                      <Mic size={30} strokeWidth={1.8} />
                    )}
                  </button>
                  <p className="mt-3 text-[12px] text-[var(--muted)]">
                    {sr.listening ? "Listening… tap to stop" : "Tap to speak"}
                  </p>
                </div>
              )}

              <textarea
                value={sr.transcript}
                onChange={(e) => sr.setTranscript(e.target.value)}
                rows={3}
                placeholder={sr.supported ? "Your words appear here…" : "Type your thought…"}
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition resize-none leading-relaxed"
              />
              {sr.listening && sr.interim && (
                <p className="mt-1.5 text-[12.5px] text-[var(--muted-2)] italic px-1">
                  {sr.interim}…
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={captureSmart}
                  disabled={!canAct}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-[var(--terra)] text-white text-[13.5px] font-semibold hover:brightness-105 active:translate-y-px transition disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  Capture smartly
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={!canAct}
                  title="Save as note"
                  className="grid place-items-center w-10 h-10 rounded-full border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)] transition disabled:opacity-40"
                >
                  <NotebookPen size={15} />
                </button>
                <button
                  type="button"
                  onClick={saveTask}
                  disabled={!canAct}
                  title="Save as task"
                  className="grid place-items-center w-10 h-10 rounded-full border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)] transition disabled:opacity-40"
                >
                  <ListTodo size={15} />
                </button>
              </div>
              <p className="mt-3 text-[11px] text-[var(--muted-2)] text-center leading-relaxed">
                &ldquo;Capture smartly&rdquo; lets the AI file it — a reminder, task,
                person, or note. Or save straight as a note / task.
              </p>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
