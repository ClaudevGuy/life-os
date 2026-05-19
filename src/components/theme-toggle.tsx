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
      className="relative inline-flex items-center shrink-0 w-12 h-[22px] rounded-full transition-colors border"
      style={{
        background: isDark ? "#0f1024" : "#e9f1ff",
        borderColor: isDark ? "#1a1d3a" : "#cdd9f0",
        boxShadow: isDark
          ? "inset 0 1px 2px rgba(0,0,0,0.4)"
          : "inset 0 1px 2px rgba(120, 140, 180, 0.18)",
      }}
    >
      {/* Track icons */}
      <Sun
        size={11}
        className={`absolute left-[5px] transition-opacity ${
          isDark ? "opacity-30 text-zinc-400" : "opacity-100"
        }`}
        style={isDark ? undefined : { color: "#e8a23a" }}
      />
      <Moon
        size={11}
        className={`absolute right-[5px] transition-opacity ${
          isDark ? "opacity-100" : "opacity-30 text-zinc-400"
        }`}
        style={isDark ? { color: "#e8d3ff" } : undefined}
        fill={isDark ? "#e8d3ff" : "none"}
      />

      {/* Thumb */}
      <span
        className="absolute top-[1.5px] w-[17px] h-[17px] rounded-full transition-transform duration-300 ease-out"
        style={{
          transform: isDark ? "translateX(28px)" : "translateX(2px)",
          background: isDark
            ? "linear-gradient(180deg, #e6e3da 0%, #cbc6b7 100%)"
            : "linear-gradient(180deg, #ffffff 0%, #f4ecd9 100%)",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      />
    </button>
  );
}
