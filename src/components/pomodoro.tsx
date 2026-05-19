"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Check } from "lucide-react";

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

export function Pomodoro() {
  const [mode, setMode] = useState<Mode>("focus");
  const [focusMin, setFocusMin] = useState<Duration>(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          // session completed — flip mode and count if was focus
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

  // Compact horizontal layout: ring on the left, controls + time on the right.
  const size = 44;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const ringColor = mode === "focus" ? "var(--accent)" : "var(--kind-habit)";

  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 py-2">
      {/* Top row: time + mode + start/reset */}
      <div className="flex items-center gap-2">
        {/* mini ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
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
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="absolute inset-0 grid place-items-center text-[var(--text)] hover:text-[var(--accent)] transition"
            aria-label={running ? "Pause" : "Start"}
            title={running ? "Pause" : "Start"}
          >
            {running ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
          </button>
        </div>

        {/* time + mode pill */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[14px] tabular-nums leading-none text-[var(--text)]">
              {mm}:{ss}
            </span>
            <button
              type="button"
              onClick={() => {
                const next: Mode = mode === "focus" ? "break" : "focus";
                setMode(next);
                setRunning(false);
                setSecondsLeft((next === "focus" ? focusMin : BREAK_MIN) * 60);
              }}
              className="text-[9px] uppercase tracking-[0.12em] px-1 py-0.5 rounded text-[var(--text-faint)] hover:text-[var(--text-muted)] transition"
              title="Toggle focus / break"
            >
              {mode}
            </button>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[var(--text-faint)]">
            {sessionsToday > 0 ? (
              <>
                {Array.from({ length: Math.min(sessionsToday, 4) }).map((_, i) => (
                  <Check key={i} size={8} className="text-[var(--accent)]" />
                ))}
                {sessionsToday > 4 && (
                  <span className="tabular-nums">+{sessionsToday - 4}</span>
                )}
              </>
            ) : (
              <span className="uppercase tracking-wide">no sessions yet</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={reset}
          className="rounded-md p-1 text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition shrink-0"
          aria-label="Reset"
          title="Reset"
        >
          <RotateCcw size={11} />
        </button>
      </div>

      {/* duration picker — only in focus mode, super compact */}
      {mode === "focus" && (
        <div className="mt-1.5 flex items-center justify-between gap-0.5">
          {FOCUS_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pickFocusDuration(d)}
              className={`flex-1 rounded text-[9px] tabular-nums py-0.5 transition ${
                focusMin === d
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]"
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
