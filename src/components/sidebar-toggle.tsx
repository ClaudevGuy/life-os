"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

const KEY = "lifeos.sidebarCollapsed";

export function SidebarToggle({
  variant = "topbar",
}: {
  variant?: "topbar" | "minimal";
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "1") {
      setCollapsed(true);
      document.documentElement.dataset.sidebar = "collapsed";
    }
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.sidebar = next ? "collapsed" : "open";
  }

  if (variant === "minimal") {
    return (
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="rounded-md p-1 text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition"
      >
        {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition shrink-0"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
    </button>
  );
}
