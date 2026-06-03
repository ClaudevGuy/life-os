"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Check, Timer, X } from "lucide-react";

type Mode = "focus" | "break";
type Duration = 15 | 25 | 50 | 90;

const FOCUS_OPTIONS: Duration[] = [15, 25, 50, 90];
const BREAK_OPTIONS = [5, 10, 15];
const DAILY_GOAL = 4; // focus sessions to aim for each day

const DAY_KEY = "lifeos.pomodoro.sessions";
const MIN_KEY = "lifeos.pomodoro.minutes";
const LABEL_KEY = "lifeos.pomodoro.label";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadCount(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<
      string,
      number
    >;
    return raw[todayKey()] ?? 0;
  } catch {
    return 0;
  }
}

function bumpCount(key: string, by = 1) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as Record<
      string,
      number
    >;
    raw[todayKey()] = (raw[todayKey()] ?? 0) + by;
    localStorage.setItem(key, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

/** A soft two-note chime so you know a session ended without watching it. */
function chime() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    [880, 1174.66].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch {
    /* audio not available — no problem */
  }
}

function fmtDuration(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function PomodoroPill() {
  const [mode, setMode] = useState<Mode>("focus");
  const [focusMin, setFocusMin] = useState<Duration>(25);
  const [breakMin, setBreakMin] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [minutesToday, setMinutesToday] = useState(0);
  const [label, setLabel] = useState("");
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionsToday(loadCount(DAY_KEY));
    setMinutesToday(loadCount(MIN_KEY));
    try {
      setLabel(localStorage.getItem(LABEL_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LABEL_KEY, label);
    } catch {
      /* ignore */
    }
  }, [label]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          chime();
          if (mode === "focus") {
            bumpCount(DAY_KEY);
            bumpCount(MIN_KEY, focusMin);
            setSessionsToday(loadCount(DAY_KEY));
            setMinutesToday(loadCount(MIN_KEY));
          }
          const nextMode: Mode = mode === "focus" ? "break" : "focus";
          setMode(nextMode);
          return (nextMode === "focus" ? focusMin : breakMin) * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, focusMin, breakMin]);

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

  function switchMode(next: Mode) {
    setMode(next);
    setRunning(false);
    setSecondsLeft((next === "focus" ? focusMin : breakMin) * 60);
  }

  function pickDuration(d: number) {
    if (mode === "focus") setFocusMin(d as Duration);
    else setBreakMin(d);
    setSecondsLeft(d * 60);
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft((mode === "focus" ? focusMin : breakMin) * 60);
  }

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const total = (mode === "focus" ? focusMin : breakMin) * 60;
  const pct = total > 0 ? (total - secondsLeft) / total : 0;
  const isFull = secondsLeft === total;

  const ringColor = mode === "focus" ? "var(--terra)" : "var(--kind-habit)";
  const idle = !running && isFull && mode === "focus";

  // Estimated finish time, e.g. "ends 3:42 PM".
  const endsAt = new Date(Date.now() + secondsLeft * 1000).toLocaleTimeString(
    undefined,
    { hour: "numeric", minute: "2-digit" },
  );
  const subline = running
    ? `ends ${endsAt}`
    : isFull
      ? `${mode === "focus" ? focusMin : breakMin}-minute ${mode}`
      : "paused";

  const options = mode === "focus" ? FOCUS_OPTIONS : BREAK_OPTIONS;
  const activeMin = mode === "focus" ? focusMin : breakMin;

  // Pill trigger ring sizing
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
        title={running ? `${mode} · ${mm}:${ss}` : "Focus timer"}
        aria-label="Focus timer"
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
          style={
            idle
              ? { fontFamily: "var(--font-sans), system-ui, sans-serif" }
              : undefined
          }
        >
          {idle ? "Focus" : `${mm}:${ss}`}
        </span>
        {sessionsToday > 0 && (
          <span className="hidden lg:inline-flex items-center gap-0.5 pl-1 ml-0.5 border-l border-[var(--border-soft)]">
            {Array.from({ length: Math.min(sessionsToday, 4) }).map((_, i) => (
              <Check key={i} size={8} className="text-[var(--terra)]" />
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
          className="absolute right-0 top-full mt-2 w-[19rem] rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl life-rise overflow-hidden z-50"
        >
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--text-muted)]">
                <Timer size={12} strokeWidth={1.8} />
                Focus timer
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid place-items-center w-6 h-6 rounded-full text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition"
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </div>

            {/* What are you focusing on? */}
            {mode === "focus" && (
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="What are you focusing on?"
                className="w-full mb-4 rounded-[10px] bg-[var(--bg-rail)] border border-[var(--border-soft)] px-3 py-2 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] text-center focus:outline-none focus:border-[var(--terra)] transition"
              />
            )}

            {/* Big ring (display) */}
            <div className="flex flex-col items-center">
              <BigRing pct={pct} color={ringColor} mm={mm} ss={ss} />
              <div
                className="mt-2 text-[11px] tabular-nums"
                style={{
                  color: running ? ringColor : "var(--text-faint)",
                }}
              >
                {subline}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)]">
              {(["focus", "break"] as Mode[]).map((m) => {
                const on = mode === m;
                const c = m === "focus" ? "var(--terra)" : "var(--kind-habit)";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className="text-[11px] uppercase tracking-[0.16em] font-semibold py-1.5 rounded-full transition capitalize"
                    style={
                      on
                        ? {
                            background: `color-mix(in oklch, ${c} 16%, transparent)`,
                            color: c,
                          }
                        : { color: "var(--text-faint)" }
                    }
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Duration */}
            <div className="mt-2.5 flex items-center gap-1 rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)] p-1">
              {options.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pickDuration(d)}
                  className={`flex-1 rounded-full text-[12px] tabular-nums font-medium py-1.5 transition ${
                    activeMin === d
                      ? "bg-[var(--bg-card)] text-[var(--text)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                      : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>

            {/* Actions — one clear primary control */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-full text-white text-[13px] font-semibold uppercase tracking-[0.12em] shadow-[0_2px_10px_var(--accent-glow)] hover:brightness-105 active:translate-y-px transition"
                style={{ background: ringColor }}
              >
                {running ? (
                  <>
                    <Pause size={14} fill="currentColor" /> Pause
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                    {isFull ? "Start" : "Resume"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={isFull && !running}
                className="grid place-items-center w-10 h-10 rounded-full border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--terra)] transition disabled:opacity-40 disabled:hover:border-[var(--border-strong)] disabled:hover:text-[var(--text-muted)]"
                aria-label="Reset"
                title="Reset"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Stats — progress toward a daily goal + time focused */}
            <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                Sessions today
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: DAILY_GOAL }).map((_, i) => {
                    const filled = i < Math.min(sessionsToday, DAILY_GOAL);
                    return (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background: filled ? "var(--terra)" : "transparent",
                          border: filled
                            ? "none"
                            : "1.5px solid var(--border-strong)",
                        }}
                      />
                    );
                  })}
                  {sessionsToday > DAILY_GOAL && (
                    <span className="text-[10px] tabular-nums font-semibold text-[var(--terra)] ml-0.5">
                      +{sessionsToday - DAILY_GOAL}
                    </span>
                  )}
                </div>
                {minutesToday > 0 && (
                  <span className="text-[11px] tabular-nums text-[var(--text-muted)] pl-1 border-l border-[var(--border-soft)]">
                    {fmtDuration(minutesToday)} focused
                  </span>
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
  mm,
  ss,
}: {
  pct: number;
  color: string;
  mm: string;
  ss: string;
}) {
  const size = 132;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        {/* faint inner wash for depth */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - stroke / 2}
          fill={`color-mix(in oklch, ${color} 7%, transparent)`}
        />
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
      <span className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-[30px] tabular-nums leading-none tracking-[-0.02em] text-[var(--text)]">
          {mm}:{ss}
        </span>
      </span>
    </div>
  );
}
