"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
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
      className="relative inline-flex items-center shrink-0 w-[60px] h-[30px] rounded-full transition-colors border-2"
      style={{
        background: isDark ? "#0f1024" : "#e9f1ff",
        borderColor: isDark ? "#2a2d4a" : "#a8b8d8",
        boxShadow: isDark
          ? "inset 0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.15)"
          : "inset 0 1px 3px rgba(120, 140, 180, 0.25), 0 1px 2px rgba(80, 100, 140, 0.12)",
      }}
    >
      {/* Track icons */}
      <Sun
        size={14}
        className={`absolute left-[7px] transition-opacity ${
          isDark ? "opacity-40 text-zinc-400" : "opacity-100"
        }`}
        style={isDark ? undefined : { color: "#e8a23a" }}
      />
      <Moon
        size={14}
        className={`absolute right-[7px] transition-opacity ${
          isDark ? "opacity-100" : "opacity-40 text-zinc-400"
        }`}
        style={isDark ? { color: "#e8d3ff" } : undefined}
        fill={isDark ? "#e8d3ff" : "none"}
      />

      {/* Thumb */}
      <span
        className="absolute top-[2px] w-[22px] h-[22px] rounded-full transition-transform duration-300 ease-out"
        style={{
          transform: isDark ? "translateX(32px)" : "translateX(2px)",
          background: isDark
            ? "linear-gradient(180deg, #e6e3da 0%, #cbc6b7 100%)"
            : "linear-gradient(180deg, #ffffff 0%, #f4ecd9 100%)",
          boxShadow:
            "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      />
    </button>
  );
}
