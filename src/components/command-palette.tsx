"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  Search,
  Inbox,
  Sun,
  Users,
  Settings,
  NotebookPen,
  ListTodo,
  Flame,
  CalendarDays,
  FolderKanban,
  BookHeart,
  Files,
  MessageSquare,
  Quote,
  Mic,
  Compass,
  CreditCard,
  Bookmark,
  Music,
} from "lucide-react";
import { db } from "@/lib/store/db";
import { Portal } from "@/components/portal";

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
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
  { href: "/today", label: "Today", icon: Sun },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/habits", label: "Habits", icon: Flame },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/people", label: "People", icon: Users },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/files", label: "Files", icon: Files },
  { href: "/ask", label: "Ask my notes", icon: MessageSquare },
  { href: "/music", label: "Music", icon: Music },
  { href: "/settings", label: "Settings", icon: Settings },
];

const KIND_META: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    color: string;
    tint: string;
  }
> = {
  note: { icon: NotebookPen, color: "var(--muted)", tint: "var(--bg-2)" },
  task: { icon: ListTodo, color: "var(--terra)", tint: "var(--terra-tint)" },
  habit: { icon: Flame, color: "var(--sage)", tint: "var(--sage-tint)" },
  journal: { icon: BookHeart, color: "var(--sage)", tint: "var(--sage-tint)" },
  highlight: { icon: Quote, color: "var(--gold)", tint: "var(--gold-tint)" },
  person: { icon: Users, color: "var(--plum)", tint: "var(--plum-tint)" },
  project: { icon: FolderKanban, color: "var(--sky)", tint: "var(--sky-tint)" },
  area: { icon: Compass, color: "var(--plum)", tint: "var(--plum-tint)" },
  voice: { icon: Mic, color: "var(--plum)", tint: "var(--plum-tint)" },
  file: { icon: Files, color: "var(--sky)", tint: "var(--sky-tint)" },
  bookmark: { icon: Bookmark, color: "var(--terra)", tint: "var(--terra-tint)" },
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

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

  // Voice control: open the palette pre-filled with a query.
  useEffect(() => {
    function onOpenSearch(e: Event) {
      const query = (e as CustomEvent<{ query?: string }>).detail?.query ?? "";
      setQ(query);
      setOpen(true);
    }
    window.addEventListener("lifeos:open-search", onOpenSearch);
    return () => window.removeEventListener("lifeos:open-search", onOpenSearch);
  }, []);

  // Debounced in-browser search against IndexedDB
  useEffect(() => {
    if (!q.trim() || !open) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const needle = q.toLowerCase();
      const all = await db.items.toArray();
      if (cancelled) return;
      const matches: Hit[] = [];
      for (const i of all) {
        const hay = [i.title, i.summary, i.body, i.topic, ...(i.keyPoints ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (hay.includes(needle)) {
          matches.push({
            id: i.id,
            kind: i.kind,
            title: i.title,
            summary: i.summary,
            topic: i.topic,
          });
          if (matches.length >= 12) break;
        }
      }
      if (!cancelled) setHits(matches);
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  if (!open) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      >
        <Command
          shouldFilter={false}
          className="w-full max-w-xl rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-2.5 px-4 border-b border-[var(--line)]">
            <Search
              size={15}
              strokeWidth={1.6}
              className="text-[var(--muted)]"
            />
            <Command.Input
              value={q}
              onValueChange={setQ}
              placeholder="Search captures, jump to pages…"
              className="flex-1 bg-transparent py-3.5 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
              autoFocus
            />
            <kbd className="text-[10.5px] font-mono tracking-[0.04em] text-[var(--muted-2)] border border-[var(--line)] rounded-[5px] px-1.5 py-0.5">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto py-2">
            <Command.Empty className="px-4 py-8 text-center text-[13px] text-[var(--muted)]">
              {q.trim() ? "No results." : "Start typing to search…"}
            </Command.Empty>

            {!q.trim() && (
              <Command.Group
                heading="Jump to"
                className="paletteGroup"
              >
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Command.Item
                    key={href}
                    value={`nav-${label}`}
                    onSelect={() => go(href)}
                    className="flex items-center gap-3 px-3 py-2 mx-2 rounded-[9px] text-[13.5px] text-[var(--ink-2)] aria-selected:bg-[var(--paper-2)] aria-selected:text-[var(--ink)] cursor-pointer transition"
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.6}
                      className="text-[var(--muted)] shrink-0"
                    />
                    {label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {hits.length > 0 && (
              <Command.Group
                heading="Items"
                className="paletteGroup"
              >
                {hits.map((h) => {
                  const meta =
                    KIND_META[h.kind] ?? {
                      icon: NotebookPen,
                      color: "var(--muted)",
                      tint: "var(--bg-2)",
                    };
                  const Icon = meta.icon;
                  return (
                    <Command.Item
                      key={h.id}
                      value={`item-${h.id}`}
                      onSelect={() => go(`/items/${h.id}`)}
                      className="flex items-start gap-3 px-3 py-2.5 mx-2 rounded-[9px] aria-selected:bg-[var(--paper-2)] cursor-pointer transition"
                    >
                      <div
                        className="grid place-items-center w-7 h-7 rounded-[8px] shrink-0 mt-px"
                        style={{
                          background: meta.tint,
                          color: meta.color,
                        }}
                      >
                        <Icon size={13} strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13.5px] text-[var(--ink)] truncate">
                            {h.title?.trim() || (
                              <em className="text-[var(--muted-2)] not-italic">
                                untitled
                              </em>
                            )}
                          </span>
                          <span
                            className="text-[9.5px] uppercase tracking-[0.12em] font-semibold shrink-0"
                            style={{ color: meta.color }}
                          >
                            {h.kind}
                          </span>
                        </div>
                        {h.summary && (
                          <p className="text-[11.5px] text-[var(--muted)] line-clamp-1 mt-0.5">
                            {h.summary}
                          </p>
                        )}
                      </div>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--paper-2)] flex items-center justify-between text-[10.5px] text-[var(--muted-2)]">
            <span className="inline-flex items-center gap-3">
              <Hint label="navigate" keys={["↑", "↓"]} />
              <Hint label="open" keys={["↵"]} />
              <Hint label="close" keys={["esc"]} />
            </span>
            <span className="font-mono tracking-[0.04em]">⌘K</span>
          </div>
        </Command>
      </div>
    </Portal>
  );
}

function Hint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="font-mono text-[10px] border border-[var(--line)] bg-[var(--paper)] rounded-[4px] px-1 min-w-[16px] text-center"
        >
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
