"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  SlidersHorizontal,
  Bell,
  Sparkles,
  RefreshCw,
  Archive,
  Database,
  Trash2,
  Lock,
  MessagesSquare,
} from "lucide-react";
import { SettingsClient } from "./settings-client";
import { ConnectionsSection } from "./connections-section";
import { NotificationsSection } from "./notifications-section";
import { AiKeySection } from "./ai-key-section";
import { SyncSection } from "./sync-section";
import { BackupsSection } from "./backups-section";
import { DataSection } from "./data-section";
import { TrashSection } from "./trash-section";

type SectionDef = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  tint: string;
  desc: string;
  Comp: React.ComponentType;
};

const SECTIONS: SectionDef[] = [
  {
    id: "preferences",
    label: "Preferences",
    icon: SlidersHorizontal,
    tint: "var(--terra)",
    desc: "Theme and density — how Life OS looks and feels.",
    Comp: SettingsClient,
  },
  {
    id: "connections",
    label: "Connections",
    icon: MessagesSquare,
    tint: "var(--sky)",
    desc: "Gmail — your inbox, on-device.",
    Comp: ConnectionsSection,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    tint: "var(--gold)",
    desc: "Reminders, renewals and nudges while the app is open.",
    Comp: NotificationsSection,
  },
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
    tint: "var(--plum)",
    desc: "Bring your own key — used directly, never stored on a server.",
    Comp: AiKeySection,
  },
  {
    id: "sync",
    label: "Sync",
    icon: RefreshCw,
    tint: "var(--sky)",
    desc: "Optional cross-device mirror via a private GitHub Gist.",
    Comp: SyncSection,
  },
  {
    id: "backups",
    label: "Backups",
    icon: Archive,
    tint: "var(--sage)",
    desc: "Full snapshots and automatic folder backups.",
    Comp: BackupsSection,
  },
  {
    id: "data",
    label: "Data",
    icon: Database,
    tint: "var(--gold)",
    desc: "Export, import and storage for everything you capture.",
    Comp: DataSection,
  },
  {
    id: "trash",
    label: "Trash",
    icon: Trash2,
    tint: "var(--muted)",
    desc: "Recently deleted items — restore or purge for good.",
    Comp: TrashSection,
  },
];

export function SettingsShell() {
  const [active, setActive] = useState(SECTIONS[0].id);

  // Scroll-spy: highlight the section nearest the top of the scroll viewport.
  useEffect(() => {
    const visible = new Set<string>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const ordered = SECTIONS.map((s) => s.id).filter((id) => visible.has(id));
        if (ordered[0]) setActive(ordered[0]);
      },
      { rootMargin: "-76px 0px -60% 0px", threshold: 0 },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  function go(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    }
  }

  return (
    <div className="px-6 sm:px-8 py-8 max-w-4xl mx-auto pg-enter">
      {/* Header */}
      <header className="flex items-center gap-3.5">
        <div
          className="grid place-items-center w-12 h-12 rounded-[15px] shrink-0"
          style={{
            background: "color-mix(in oklch, var(--terra) 15%, var(--paper))",
            border: "1px solid color-mix(in oklch, var(--terra) 32%, transparent)",
          }}
        >
          <SettingsIcon size={22} className="text-[var(--terra)]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-none">
            Settings
          </h1>
          <p className="text-[13.5px] text-[var(--muted)] mt-2 leading-none">
            Preferences and data — all stored on this device.
          </p>
        </div>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-[var(--line)] text-[11px] font-medium text-[var(--muted)] shrink-0">
          <Lock size={11} className="text-[var(--sage)]" />
          Local · v1.0
        </span>
      </header>

      <div className="mt-8 grid lg:grid-cols-[176px_minmax(0,1fr)] gap-x-10">
        {/* Sticky section nav */}
        <nav className="hidden lg:block" aria-label="Settings sections">
          <div className="sticky top-[78px] space-y-0.5">
            {SECTIONS.map((s) => {
              const on = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => go(e, s.id)}
                  className={`group relative flex items-center gap-2.5 pl-3 pr-2 h-9 rounded-[10px] text-[13px] transition-colors ${
                    on
                      ? "bg-[var(--paper-2)] text-[var(--ink)] font-medium"
                      : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)]/60"
                  }`}
                >
                  {on && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full"
                      style={{ background: s.tint }}
                    />
                  )}
                  <s.icon
                    size={15}
                    style={{ color: on ? s.tint : "var(--muted-2)" }}
                  />
                  {s.label}
                </a>
              );
            })}
            <p className="pt-3 mt-3 border-t border-[var(--line)] px-3 text-[11px] leading-relaxed text-[var(--muted-2)]">
              Everything lives in your browser — nothing on a server.
            </p>
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-9 min-w-0">
          {SECTIONS.map((s) => (
            <section
              key={s.id}
              id={s.id}
              style={{ scrollMarginTop: 84 }}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  className="grid place-items-center w-7 h-7 rounded-[9px] shrink-0"
                  style={{
                    background: `color-mix(in oklch, ${s.tint} 15%, transparent)`,
                    color: s.tint,
                  }}
                >
                  <s.icon size={14} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-[var(--ink)] leading-none">
                    {s.label}
                  </h2>
                  <p className="text-[12.5px] text-[var(--muted)] mt-1.5 leading-none">
                    {s.desc}
                  </p>
                </div>
              </div>
              <s.Comp />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
