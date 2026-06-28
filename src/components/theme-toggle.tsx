"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Cloud, type LucideIcon } from "lucide-react";

type Mode = "light" | "cloudy" | "dark";

// Order across the track, left → right (brightest → darkest).
const ORDER: Mode[] = ["light", "cloudy", "dark"];
// Clicking advances and wraps.
const NEXT: Record<Mode, Mode> = {
  light: "cloudy",
  cloudy: "dark",
  dark: "light",
};
const LABEL: Record<Mode, string> = {
  light: "light",
  cloudy: "cloudy mirror",
  dark: "dark",
};

// Geometry: pill 88px, knob 24px, 3px padding → slot centers at 15 / 44 / 73.
// `iconLeft` = slot center − half a 13px icon, so the static glyphs sit centered.
const CFG: Record<
  Mode,
  { icon: LucideIcon; knobLeft: number; iconLeft: number; color: string; glow: string }
> = {
  light: { icon: Sun, knobLeft: 3, iconLeft: 8.5, color: "#E6A23C", glow: "rgba(230,162,60,0.55)" },
  cloudy: { icon: Cloud, knobLeft: 32, iconLeft: 37.5, color: "#4F9BE8", glow: "rgba(79,155,232,0.6)" },
  dark: { icon: Moon, knobLeft: 61, iconLeft: 66.5, color: "#7E8DF0", glow: "rgba(126,141,240,0.55)" },
};

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setMode(
      current === "light" ? "light" : current === "cloudy" ? "cloudy" : "dark",
    );
    // Stay in sync when something else (e.g. the voice assistant) changes it.
    function onThemeEvent(e: Event) {
      const m = (e as CustomEvent<{ mode?: string }>).detail?.mode;
      if (m === "light" || m === "dark" || m === "cloudy") setMode(m);
    }
    window.addEventListener("lifeos:theme", onThemeEvent);
    return () => window.removeEventListener("lifeos:theme", onThemeEvent);
  }, []);

  function cycle() {
    const nextMode = NEXT[mode];
    setMode(nextMode);
    document.documentElement.dataset.theme = nextMode;
    try {
      localStorage.setItem("lifeos.theme", nextMode);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(
      new CustomEvent("lifeos:theme", { detail: { mode: nextMode } }),
    );
  }

  const next = NEXT[mode];
  const active = CFG[mode];
  const ActiveIcon = active.icon;

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABEL[mode]} — switch to ${LABEL[next]}`}
      aria-label={`Theme: ${LABEL[mode]}. Switch to ${LABEL[next]} mode.`}
      className="relative shrink-0 w-[88px] h-[30px] rounded-full transition-transform active:scale-[0.97]"
      style={{
        border: "1px solid var(--line-2)",
        // Calm, theme-adaptive recessed track so every icon stays legible.
        background: "var(--paper-2)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.14)",
      }}
    >
      {/* All three modes are always visible at a readable contrast. */}
      {ORDER.map((m) => {
        const Icon = CFG[m].icon;
        return (
          <Icon
            key={m}
            size={13}
            strokeWidth={1.9}
            className="absolute top-1/2 -translate-y-1/2 transition-opacity duration-200"
            style={{
              left: CFG[m].iconLeft,
              color: "var(--muted)",
              // The active one is hidden; the knob carries its bright version.
              opacity: m === mode ? 0 : 0.85,
            }}
          />
        );
      })}

      {/* Sliding knob — a little white pebble with a mode-colored glow. */}
      <span
        aria-hidden
        className="absolute top-[3px] grid place-items-center w-6 h-6 rounded-full transition-[left] duration-300 ease-[cubic-bezier(0.3,0.7,0.3,1)]"
        style={{
          left: active.knobLeft,
          background: "linear-gradient(180deg, #FFFFFF 0%, #EFF2F8 100%)",
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.7), 0 2px 6px rgba(10,12,30,0.35), 0 0 16px 1px ${active.glow}`,
        }}
      >
        <ActiveIcon size={14} strokeWidth={2} style={{ color: active.color }} />
      </span>
    </button>
  );
}
