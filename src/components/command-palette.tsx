"use client";

import { useEffect, useState, useRef } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Search,
  Inbox,
  Sun,
  Users,
  Lightbulb,
  Clock,
  Network,
  Settings,
} from "lucide-react";

type Hit = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
  topic: string | null;
};

const NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/people", label: "People", icon: Users },
  { href: "/decisions", label: "Decisions", icon: Lightbulb },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/settings/keys", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!q.trim() || !open) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=12`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits);
      } catch {
        // aborted or failed; ignore
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        shouldFilter={false}
        className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-zinc-900">
          <Search size={14} className="text-zinc-500" />
          <Command.Input
            value={q}
            onValueChange={setQ}
            placeholder="Search captures, jump to pages…"
            className="flex-1 bg-transparent py-3 text-sm placeholder:text-zinc-600 focus:outline-none"
            autoFocus
          />
          <kbd className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto py-1">
          <Command.Empty className="px-3 py-6 text-center text-sm text-zinc-600">
            {q.trim() ? "No results." : "Start typing to search…"}
          </Command.Empty>

          {!q.trim() && (
            <Command.Group
              heading="Jump to"
              className="text-[10px] text-zinc-600 uppercase tracking-wide px-3 mt-1"
            >
              {NAV.map(({ href, label, icon: Icon }) => (
                <Command.Item
                  key={href}
                  value={`nav-${label}`}
                  onSelect={() => go(href)}
                  className="flex items-center gap-2.5 px-3 py-2 mx-1 my-0.5 rounded-md text-sm text-zinc-300 aria-selected:bg-zinc-900 cursor-pointer"
                >
                  <Icon size={14} className="text-zinc-500" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {hits.length > 0 && (
            <Command.Group
              heading="Items"
              className="text-[10px] text-zinc-600 uppercase tracking-wide px-3 mt-2"
            >
              {hits.map((h) => (
                <Command.Item
                  key={h.id}
                  value={`item-${h.id}`}
                  onSelect={() => go(`/items/${h.id}`)}
                  className="flex flex-col items-start gap-0.5 px-3 py-2 mx-1 my-0.5 rounded-md text-sm aria-selected:bg-zinc-900 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                      {h.kind}
                    </span>
                    <span className="text-zinc-200">{h.title ?? "untitled"}</span>
                  </div>
                  {h.summary && (
                    <p className="text-xs text-zinc-500 line-clamp-1 ml-[3.25rem]">
                      {h.summary}
                    </p>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
