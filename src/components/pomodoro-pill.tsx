"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Check, Timer, X } from "lucide-react";

type Mode = "focus" | "break";
type Duration = 15 | 25 | 50 | 90;

const FOCUS_OPTIONS: Duration[] = [15, 25, 50, 90];
const BREAK_MIN = 5;
const DAY_KEY = "lifeos.pomodoro.sessions";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadSessions(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem(DAY_KEY) ?? "{}") as Record<
      string,
      number
    >;
    return raw[todayKey()] ?? 0;
  } catch {
    return 0;
  }
}

function bumpSessions() {
  try {
    const raw = JSON.parse(localStorage.getItem(DAY_KEY) ?? "{}") as Record<
      string,
      number
    >;
    raw[todayKey()] = (raw[todayKey()] ?? 0) + 1;
    localStorage.setItem(DAY_KEY, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

export function PomodoroPill() {
  const [mode, setMode] = useState<Mode>("focus");
  const [focusMin, setFocusMin] = useState<Duration>(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionsToday(loadSessions());
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          if (mode === "focus") {
            bumpSessions();
            setSessionsToday(loadSessions());
          }
          const nextMode: Mode = mode === "focus" ? "break" : "focus";
          setMode(nextMode);
          return (nextMode === "focus" ? focusMin : BREAK_MIN) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, focusMin]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function reset() {
    setRunning(false);
    setSecondsLeft((mode === "focus" ? focusMin : BREAK_MIN) * 60);
  }

  function pickFocusDuration(d: Duration) {
    setFocusMin(d);
    if (mode === "focus") {
      setSecondsLeft(d * 60);
      setRunning(false);
    }
  }

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const total = (mode === "focus" ? focusMin : BREAK_MIN) * 60;
  const pct = (total - secondsLeft) / total;

  const ringColor = mode === "focus" ? "var(--accent)" : "var(--kind-habit)";
  const idle = !running && secondsLeft === focusMin * 60 && mode === "focus";

  // Pill ring sizing
  const size = 22;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`focus-hide inline-flex items-center gap-2 h-[30px] px-3 rounded-[10px] border bg-[var(--paper)] text-[13px] font-medium leading-none transition ${
          running
            ? "border-[var(--terra)] text-[var(--ink)] shadow-[0_0_0_3px_var(--terra-tint)]"
            : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--terra)] hover:text-[var(--terra)]"
        }`}
        title={running ? `${mode} · ${mm}:${ss}` : "Pomodoro"}
        aria-label="Pomodoro timer"
      >
        <span className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className="absolute inset-0 -rotate-90"
            aria-hidden
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--border-soft)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            {idle ? (
              <Timer size={10} className="text-[var(--text-faint)]" />
            ) : running ? (
              <span
                className="block w-1 h-1 rounded-full animate-pulse"
                style={{ background: ringColor }}
              />
            ) : (
              <Pause size={9} className="text-[var(--text-muted)]" />
            )}
          </span>
        </span>
        <span
          className={`text-[13px] font-medium leading-none ${
            idle ? "" : "font-mono tabular-nums"
          }`}
          style={idle ? { fontFamily: "var(--font-sans), system-ui, sans-serif" } : undefined}
        >
          {idle ? "Focus" : `${mm}:${ss}`}
        </span>
        {sessionsToday > 0 && (
          <span className="hidden lg:inline-flex items-center gap-0.5 pl-1 ml-0.5 border-l border-[var(--border-soft)]">
            {Array.from({ length: Math.min(sessionsToday, 4) }).map((_, i) => (
              <Check key={i} size={8} className="text-[var(--accent)]" />
            ))}
            {sessionsToday > 4 && (
              <span className="text-[9px] tabular-nums text-[var(--text-faint)] ml-0.5">
                +{sessionsToday - 4}
              </span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl life-rise overflow-hidden z-50"
        >
          {/* Header with big ring */}
          <div className="relative h-28 overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 opacity-50"
              style={{
                background: `radial-gradient(ellipse 80% 70% at 50% 40%, color-mix(in oklch, ${ringColor} 45%, transparent) 0%, transparent 70%)`,
              }}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-full text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition"
              aria-label="Close"
            >
              <X size={12} />
            </button>
            <div className="absolute inset-0 grid place-items-center">
              <BigRing
                pct={pct}
                color={ringColor}
                running={running}
                onClick={() => setRunning((r) => !r)}
                mm={mm}
                ss={ss}
                mode={mode}
              />
            </div>
          </div>

          <div className="px-4 pb-4">
            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-2 -mt-1">
              <button
                type="button"
                onClick={() => {
                  setMode("focus");
                  setRunning(false);
                  setSecondsLeft(focusMin * 60);
                }}
                className={`text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full transition ${
                  mode === "focus"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                }`}
              >
                Focus
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("break");
                  setRunning(false);
                  setSecondsLeft(BREAK_MIN * 60);
                }}
                className={`text-[10px] uppercase tracking-[0.18em] px-3 py-1 rounded-full transition ${
                  mode === "break"
                    ? "bg-[var(--kind-habit)]/15 text-[var(--kind-habit)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                }`}
              >
                Break
              </button>
            </div>

            {/* Duration */}
            {mode === "focus" && (
              <div className="mt-3 flex items-center gap-1 rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)] p-1">
                {FOCUS_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickFocusDuration(d)}
                    className={`flex-1 rounded-full text-[11px] tabular-nums font-medium py-1 transition ${
                      focusMin === d
                        ? "bg-[var(--bg-card)] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.3)]"
                        : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-full bg-[var(--accent)] text-zinc-950 text-xs font-semibold uppercase tracking-[0.1em] shadow-[0_2px_8px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 active:translate-y-px transition"
              >
                {running ? <Pause size={12} /> : <Play size={12} />}
                {running ? "Pause" : "Start"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="grid place-items-center w-9 h-9 rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition"
                aria-label="Reset"
                title="Reset"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Sessions today */}
            <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              <span>Sessions today</span>
              <div className="flex items-center gap-0.5">
                {sessionsToday === 0 ? (
                  <span className="normal-case tracking-normal text-[var(--text-faint)]">
                    none yet
                  </span>
                ) : (
                  <>
                    {Array.from({ length: Math.min(sessionsToday, 6) }).map((_, i) => (
                      <Check key={i} size={10} className="text-[var(--accent)]" />
                    ))}
                    {sessionsToday > 6 && (
                      <span className="tabular-nums text-[var(--text-muted)] ml-1">
                        +{sessionsToday - 6}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BigRing({
  pct,
  color,
  running,
  onClick,
  mm,
  ss,
  mode,
}: {
  pct: number;
  color: string;
  running: boolean;
  onClick: () => void;
  mm: string;
  ss: string;
  mode: Mode;
}) {
  const size = 84;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative group"
      style={{ width: size, height: size }}
      aria-label={running ? "Pause" : "Start"}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[18px] tabular-nums leading-none text-[var(--text)]">
          {mm}:{ss}
        </span>
        <span
          className="mt-1 text-[8px] uppercase tracking-[0.18em]"
          style={{ color }}
        >
          {mode}
        </span>
      </span>
      <span
        aria-hidden
        className="absolute inset-0 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/30 backdrop-blur-sm"
      >
        {running ? (
          <Pause size={18} className="text-white" />
        ) : (
          <Play size={18} className="text-white ml-0.5" />
        )}
      </span>
    </button>
  );
}
