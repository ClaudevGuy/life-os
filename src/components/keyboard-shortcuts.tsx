"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";

/**
 * Global g-prefixed navigation shortcuts, plus a "?" cheat sheet.
 *
 * g i  → Inbox
 * g t  → Tasks
 * g y  → Today
 * g p  → People
 * g n  → Notes
 * g h  → Habits
 * g a  → Ask
 * g k  → Calendar
 * g s  → Stats
 * g r  → Reviews
 * g l  → Highlights
 * g o  → Goals
 * g d  → Decisions
 * g m  → Templates
 * g f  → Projects
 * g g  → Graph
 *
 *  ? → open this help
 *  c → quick capture (handled in QuickCapture)
 *  ⌘K → command palette (handled in CommandPalette)
 */
const MAP: Record<string, { href: string; label: string }> = {
  i: { href: "/inbox", label: "Inbox" },
  t: { href: "/tasks", label: "Tasks" },
  y: { href: "/today", label: "Today" },
  p: { href: "/people", label: "People" },
  n: { href: "/notes", label: "Notes" },
  h: { href: "/habits", label: "Habits" },
  a: { href: "/ask", label: "Ask my notes" },
  k: { href: "/calendar", label: "Calendar" },
  s: { href: "/stats", label: "Stats" },
  r: { href: "/reviews", label: "Reviews" },
  l: { href: "/highlights", label: "Highlights" },
  o: { href: "/goals", label: "Goals" },
  d: { href: "/decisions", label: "Decisions" },
  m: { href: "/templates", label: "Templates" },
  f: { href: "/projects", label: "Projects" },
  g: { href: "/graph", label: "Graph" },
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [primed, setPrimed] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (inEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setHelp((v) => !v);
        return;
      }
      if (e.key === "Escape" && help) {
        setHelp(false);
        return;
      }

      if (e.key === "g") {
        setPrimed(true);
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => setPrimed(false), 1200);
        return;
      }
      if (primed) {
        const target = MAP[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          router.push(target.href);
        }
        setPrimed(false);
        if (resetTimer) clearTimeout(resetTimer);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [primed, router, help]);

  return (
    <>
      {primed && (
        <div className="fixed bottom-24 right-6 z-40 rounded-lg border border-[var(--accent)] bg-[var(--bg-card)] px-3 py-2 shadow-lg life-rise">
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent)]">
            Go to…
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            press a letter (i, t, y, n, …)
          </div>
        </div>
      )}
      {help && <HelpModal onClose={() => setHelp(false)} />}
    </>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden life-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border-soft)] flex items-center gap-2">
          <Keyboard size={14} className="text-[var(--accent)]" />
          <h2 className="text-sm font-medium">Keyboard shortcuts</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <Row k="c" label="Quick capture" />
          <Row k="⌘K" label="Search & jump" />
          <Row k="?" label="This help" />
          <Row k="esc" label="Close" />
          <div className="col-span-2 pt-3 mt-1 border-t border-[var(--border-soft)]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-2">
              Navigate (press g then letter)
            </div>
          </div>
          {Object.entries(MAP).map(([k, v]) => (
            <Row key={k} k={`g ${k}`} label={v.label} />
          ))}
        </div>
        <div className="px-5 py-3 text-[10px] text-[var(--text-faint)] uppercase tracking-wide bg-[var(--bg-rail)]/40 border-t border-[var(--border-soft)]">
          Press ? again or click anywhere to close
        </div>
      </div>
    </div>
  );
}

function Row({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--text-muted)]">{label}</span>
      <kbd className="font-mono text-[10px] text-[var(--text)] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1.5 py-0.5 tabular-nums">
        {k}
      </kbd>
    </div>
  );
}
