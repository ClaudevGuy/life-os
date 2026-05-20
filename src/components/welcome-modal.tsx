"use client";

import { useEffect, useState } from "react";
import { Sparkles, Inbox, Command, Plus } from "lucide-react";

const KEY = "lifeos.welcome.v1";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;

  const steps = [
    {
      icon: Sparkles,
      title: "Welcome to Life OS",
      body:
        "One quiet place for everything you want to remember — notes, tasks, decisions, people, daily journals, habits, goals, highlights.",
    },
    {
      icon: Plus,
      title: "Capture in two keystrokes",
      body:
        "Press c anywhere to open quick capture. Jot a note, log a decision, or set a task. AI fills in the details after.",
    },
    {
      icon: Command,
      title: "Search and jump with ⌘K",
      body:
        "Find anything you've saved by meaning, not just keywords. Use ⌘K (or Ctrl+K) to search and jump to any page.",
    },
    {
      icon: Inbox,
      title: "Your data is yours",
      body:
        "Everything lives in your browser. Connect a private GitHub gist in Settings to sync across devices — no server, no account.",
    },
  ];

  const StepIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden life-rise">
        <div className="relative h-32 tod-evening overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid place-items-center w-14 h-14 rounded-full bg-white/10 backdrop-blur border border-white/15">
              <StepIcon size={22} className="text-white" />
            </div>
          </div>
        </div>

        <div className="px-7 py-6 text-center">
          <h2 className="text-xl font-semibold tracking-tight life-shine">
            {steps[step].title}
          </h2>
          <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
            {steps[step].body}
          </p>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  i === step
                    ? "bg-[var(--accent)] w-5"
                    : "bg-[var(--border-strong)]"
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={dismiss}
              className="life-btn life-btn-sm life-btn-ghost"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => (step === steps.length - 1 ? dismiss() : setStep(step + 1))}
              className="life-btn life-btn-primary"
            >
              {step === steps.length - 1 ? "Let's go" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
