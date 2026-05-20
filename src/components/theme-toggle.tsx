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
      className="relative inline-flex items-center justify-between shrink-0 w-[60px] h-[30px] rounded-full border transition-colors"
      style={{
        background: isDark ? "var(--ink)" : "var(--paper)",
        borderColor: "var(--line)",
        padding: "0 7px",
      }}
    >
      <Sun
        size={13}
        strokeWidth={1.6}
        style={{ color: isDark ? "var(--muted)" : "var(--gold)" }}
      />
      <Moon
        size={13}
        strokeWidth={1.6}
        style={{ color: isDark ? "var(--paper)" : "var(--muted-2)" }}
      />
      <span
        aria-hidden
        className="absolute top-[3px] w-6 h-6 rounded-full transition-[left] duration-[220ms] ease-[cubic-bezier(0.3,0.7,0.3,1)]"
        style={{
          left: isDark ? 32 : 3,
          background: isDark ? "var(--paper)" : "var(--ink)",
        }}
      />
    </button>
  );
}
