"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
    // Stay in sync when something else (e.g. the voice assistant) flips it.
    function onThemeEvent(e: Event) {
      const mode = (e as CustomEvent<{ mode?: string }>).detail?.mode;
      if (mode === "light" || mode === "dark") setTheme(mode);
    }
    window.addEventListener("lifeos:theme", onThemeEvent);
    return () => window.removeEventListener("lifeos:theme", onThemeEvent);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("lifeos.theme", next);
    } catch {
      /* ignore */
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative shrink-0 w-[56px] h-[30px] rounded-full border overflow-hidden transition-[background] duration-300 active:scale-[0.97]"
      style={{
        borderColor: "var(--line)",
        background: isDark
          ? "linear-gradient(180deg, #1C2740 0%, #0D1322 100%)"
          : "linear-gradient(180deg, #FCEFD4 0%, #FBF7EE 100%)",
      }}
    >
      {/* faint track icons */}
      <Sun
        size={12}
        strokeWidth={1.8}
        className="absolute left-[8px] top-1/2 -translate-y-1/2 transition-opacity"
        style={{ color: "#E0A94A", opacity: isDark ? 0.35 : 0 }}
      />
      <Moon
        size={11}
        strokeWidth={1.8}
        className="absolute right-[9px] top-1/2 -translate-y-1/2 transition-opacity"
        style={{ color: "#B9C6E2", opacity: isDark ? 0 : 0.4 }}
      />
      {/* tiny stars in the night track */}
      {isDark && (
        <>
          <span
            className="absolute w-[2px] h-[2px] rounded-full bg-white/70"
            style={{ left: 12, top: 8 }}
          />
          <span
            className="absolute w-[1.5px] h-[1.5px] rounded-full bg-white/50"
            style={{ left: 18, top: 17 }}
          />
        </>
      )}
      {/* sliding knob carries the active icon */}
      <span
        aria-hidden
        className="absolute top-[3px] grid place-items-center w-6 h-6 rounded-full transition-[left,background] duration-300 ease-[cubic-bezier(0.3,0.7,0.3,1)]"
        style={{
          left: isDark ? 27 : 3,
          background: isDark ? "#0B1020" : "#FFFFFF",
          boxShadow: isDark
            ? "0 1px 4px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)"
            : "0 1px 4px rgba(180,140,70,0.35), inset 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {isDark ? (
          <Moon size={13} strokeWidth={1.8} style={{ color: "#D6E0F0" }} />
        ) : (
          <Sun size={13} strokeWidth={1.8} style={{ color: "#E0A94A" }} />
        )}
      </span>
    </button>
  );
}
