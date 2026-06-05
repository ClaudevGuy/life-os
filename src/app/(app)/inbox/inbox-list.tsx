"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Archive,
  Folder,
  GripVertical,
  Inbox as InboxIcon,
  NotebookPen,
  ListTodo,
  Quote,
  FolderKanban,
  Flame,
  Users,
  Mic,
  Compass,
  Files,
  CreditCard,
  Bookmark,
  FileText,
  Check,
  Sparkles,
} from "lucide-react";
import {
  useInboxItems,
  updateItem,
  type StoredItem,
} from "@/lib/store/items";

type TabKey = "all" | "note" | "task" | "highlight" | "project";

type IconType = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}>;

const TABS: { key: TabKey; label: string; icon: IconType; color: string }[] = [
  { key: "all", label: "All", icon: InboxIcon, color: "var(--terra)" },
  { key: "note", label: "Notes", icon: NotebookPen, color: "var(--muted)" },
  { key: "task", label: "Tasks", icon: ListTodo, color: "var(--terra)" },
  { key: "highlight", label: "Highlights", icon: Quote, color: "var(--gold)" },
  { key: "project", label: "Projects", icon: FolderKanban, color: "var(--sky)" },
];

const DRAG_THRESHOLD = 110;

const KIND_ICON: Record<string, IconType> = {
  note: NotebookPen,
  task: ListTodo,
  highlight: Quote,
  project: FolderKanban,
  habit: Flame,
  person: Users,
  voice: Mic,
  area: Compass,
  file: Files,
  subscription: CreditCard,
  bookmark: Bookmark,
};

export function InboxList() {
  const rows = useInboxItems() ?? [];
  const [tab, setTab] = useState<TabKey>("all");

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: rows.length,
      note: 0,
      task: 0,
      highlight: 0,
      project: 0,
    };
    for (const r of rows) {
      if (r.kind === "note") c.note++;
      else if (r.kind === "task") c.task++;
      else if (r.kind === "highlight") c.highlight++;
      else if (r.kind === "project") c.project++;
    }
    return c;
  }, [rows]);

  const filtered: StoredItem[] = useMemo(
    () => (tab === "all" ? rows : rows.filter((r) => r.kind === tab)),
    [rows, tab],
  );

  return (
    <div>
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div className="flex items-center gap-3.5">
          <div
            className="grid place-items-center w-12 h-12 rounded-[15px] shrink-0"
            style={{
              background: "color-mix(in oklch, var(--terra) 15%, var(--paper))",
              border: "1px solid color-mix(in oklch, var(--terra) 32%, transparent)",
            }}
          >
            <InboxIcon size={22} strokeWidth={1.7} className="text-[var(--terra)]" />
          </div>
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-none">
              Inbox
            </h1>
            <p className="text-[13.5px] text-[var(--muted)] mt-2 leading-none">
              Triage what you&apos;ve captured — file to keep, archive to dismiss.
            </p>
          </div>
        </div>
        <StatusPill count={rows.length} />
      </header>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {TABS.map((t) => {
          const active = tab === t.key;
          const n = counts[t.key];
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 h-9 pl-3 pr-2.5 rounded-full text-[13px] font-medium transition-all ${
                active
                  ? "text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              style={
                active
                  ? {
                      background: `color-mix(in oklch, ${t.color} 16%, var(--paper))`,
                      border: `1px solid color-mix(in oklch, ${t.color} 40%, transparent)`,
                      boxShadow: "var(--shadow-1)",
                    }
                  : {
                      background: "var(--paper)",
                      border: "1px solid var(--line)",
                    }
              }
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                style={{ color: active ? t.color : "var(--muted-2)" }}
              />
              {t.label}
              <span
                className="inline-flex items-center justify-center min-w-[19px] h-[18px] px-1 rounded-full text-[10.5px] font-mono font-semibold tabular-nums"
                style={{
                  background: active
                    ? `color-mix(in oklch, ${t.color} 22%, transparent)`
                    : "var(--bg-2)",
                  color: active ? t.color : "var(--muted-2)",
                }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyInbox totalEmpty={rows.length === 0} />
      ) : (
        <ul className="flex flex-col gap-2.5 life-stagger">
          {filtered.map((it) => (
            <InboxRow key={it.id} item={it} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12.5px] font-semibold"
        style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
      >
        <Check size={13} strokeWidth={2.4} />
        Inbox zero
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full text-[12.5px] font-semibold"
      style={{ background: "var(--terra-tint)", color: "var(--terra)" }}
    >
      <span className="relative flex w-2 h-2">
        <span
          className="animate-ping absolute inline-flex w-full h-full rounded-full opacity-60"
          style={{ background: "var(--terra)" }}
        />
        <span
          className="relative inline-flex rounded-full w-2 h-2"
          style={{ background: "var(--terra)" }}
        />
      </span>
      {count} to triage
    </span>
  );
}

function InboxRow({ item }: { item: StoredItem }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);

  const archive = useCallback(async () => {
    try {
      await updateItem(item.id, { status: "archived" });
      toast.success("Archived");
    } catch {
      toast.error("Couldn't archive");
    }
  }, [item.id]);

  const file = useCallback(async () => {
    try {
      await updateItem(item.id, { status: "active" });
      toast.success("Filed");
    } catch {
      toast.error("Couldn't file");
    }
  }, [item.id]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDx(0);
    startXRef.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    setDx(e.clientX - startXRef.current);
  }
  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const final = e.clientX - startXRef.current;
    setDragging(false);
    setDx(0);
    if (Math.abs(final) > DRAG_THRESHOLD) {
      if (final > 0) void file();
      else void archive();
    }
  }

  const showArchiveBg = dx < -20;
  const showFileBg = dx > 20;
  const opacity = Math.max(0.5, 1 - Math.abs(dx) / 280);
  const color = kindColor(item.kind);
  const Icon = KIND_ICON[item.kind] ?? FileText;
  const relWhen = formatRel(item.capturedAt);
  const kindLabel = labelForKind(item.kind);
  const preview = previewText(item);
  const href = item.kind === "habit" ? "/habits" : `/items/${item.id}`;

  return (
    <li className="relative group">
      {/* Swipe action backgrounds */}
      <div
        className="absolute inset-0 rounded-[14px] overflow-hidden flex"
        aria-hidden
      >
        <div
          className="flex-1 flex items-center justify-start px-5 gap-2 transition-opacity"
          style={{
            background: "var(--terra-tint)",
            color: "var(--terra)",
            opacity: showArchiveBg ? 1 : 0,
          }}
        >
          <Archive size={14} strokeWidth={1.6} />
          <span className="text-[12px] font-semibold tracking-[0.1em]">
            ARCHIVE
          </span>
        </div>
        <div
          className="flex-1 flex items-center justify-end px-5 gap-2 transition-opacity"
          style={{
            background: "var(--sage-tint)",
            color: "var(--sage)",
            opacity: showFileBg ? 1 : 0,
          }}
        >
          <span className="text-[12px] font-semibold tracking-[0.1em]">FILE</span>
          <Folder size={14} strokeWidth={1.6} />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative z-[1] rounded-[14px] border bg-[var(--paper)] overflow-hidden flex items-stretch hover:shadow-[var(--shadow-2)]"
        style={{
          borderColor: "var(--line)",
          transform: `translateX(${dx}px)`,
          transition: dragging
            ? "none"
            : "transform .25s ease, box-shadow .15s, border-color .15s",
          opacity,
        }}
      >
        {/* Color accent edge */}
        <span aria-hidden className="w-[3px] shrink-0" style={{ background: color }} />

        <div className="relative flex items-center gap-3.5 px-4 py-3.5 flex-1 min-w-0">
          {/* hover tint wash */}
          <span
            aria-hidden
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              background: `linear-gradient(90deg, color-mix(in oklch, ${color} 8%, transparent), transparent 42%)`,
            }}
          />

          {/* Kind icon tile */}
          <div
            className="relative grid place-items-center w-[40px] h-[40px] rounded-[11px] shrink-0 transition-transform group-hover:scale-[1.05]"
            style={{
              background: `color-mix(in oklch, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
              color,
            }}
          >
            <Icon size={18} strokeWidth={1.7} />
          </div>

          {/* Body */}
          <div className="relative min-w-0 flex-1">
            <Link
              href={href}
              className="block text-[15.5px] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--terra)] truncate transition"
            >
              {item.title?.trim() ? (
                item.title
              ) : (
                <em className="text-[var(--muted-2)] not-italic">Untitled</em>
              )}
            </Link>
            <div className="mt-1 flex items-center gap-2 min-w-0 text-[12px]">
              <span
                className="inline-flex items-center shrink-0 px-1.5 py-px rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold"
                style={{
                  background: `color-mix(in oklch, ${color} 13%, transparent)`,
                  color,
                }}
              >
                {kindLabel}
              </span>
              <span className="text-[var(--muted-2)] font-mono tabular-nums shrink-0">
                {relWhen}
              </span>
              {preview && (
                <>
                  <span className="text-[var(--line-2)] shrink-0">·</span>
                  <span className="text-[var(--muted)] truncate min-w-0">
                    {preview}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right cluster — reveals on hover (always visible on touch) */}
          <div className="relative flex items-center gap-1 shrink-0 self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition">
            <button
              type="button"
              aria-label="Drag to archive or file"
              title="Drag: ← archive · file →"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="hidden sm:grid place-items-center w-7 h-8 rounded-[7px] text-[var(--muted-2)] hover:text-[var(--muted)] cursor-grab active:cursor-grabbing select-none touch-none"
            >
              <GripVertical size={15} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={file}
              title="File (keep, leave inbox)"
              aria-label="File"
              className="grid place-items-center w-8 h-8 rounded-[9px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--sage-tint)] hover:text-[var(--sage)] hover:border-[var(--sage)]/40 hover:-translate-y-px transition"
            >
              <Folder size={14} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              onClick={archive}
              title="Archive"
              aria-label="Archive"
              className="grid place-items-center w-8 h-8 rounded-[9px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--terra-tint)] hover:text-[var(--terra)] hover:border-[var(--terra)]/40 hover:-translate-y-px transition"
            >
              <Archive size={14} strokeWidth={1.7} />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyInbox({ totalEmpty }: { totalEmpty: boolean }) {
  return (
    <div className="relative mt-2 rounded-[16px] border border-dashed border-[var(--line-2)] py-14 px-6 text-center overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, color-mix(in oklch, var(--sage) 12%, transparent), transparent 70%)",
        }}
      />
      <div
        className="relative mx-auto mb-4 grid place-items-center w-[60px] h-[60px] rounded-[18px]"
        style={{
          background: totalEmpty
            ? "color-mix(in oklch, var(--sage) 16%, var(--paper))"
            : "var(--paper)",
          color: totalEmpty ? "var(--sage)" : "var(--terra)",
          boxShadow: "var(--shadow-1)",
          border: totalEmpty
            ? "1px solid color-mix(in oklch, var(--sage) 30%, transparent)"
            : "1px solid var(--line)",
        }}
      >
        {totalEmpty ? (
          <Sparkles size={26} strokeWidth={1.6} />
        ) : (
          <InboxIcon size={24} strokeWidth={1.6} />
        )}
      </div>
      <div className="relative text-[18px] font-semibold text-[var(--ink)]">
        {totalEmpty ? "Inbox zero." : "Nothing in this filter."}
      </div>
      <p className="relative mt-1.5 text-[13.5px] text-[var(--muted)] max-w-md mx-auto leading-relaxed">
        {totalEmpty ? (
          <>
            Nothing left to triage — nice rhythm. Press{" "}
            <kbd className="px-1.5 py-0.5 rounded-[6px] bg-[var(--paper-2)] border border-[var(--line)] text-[11.5px] font-mono text-[var(--ink-2)]">
              c
            </kbd>{" "}
            to capture something new.
          </>
        ) : (
          "Try another kind, or capture something new."
        )}
      </p>
    </div>
  );
}

function kindColor(kind: string): string {
  switch (kind) {
    case "task":
      return "var(--terra)";
    case "highlight":
    case "decision":
      return "var(--gold)";
    case "journal":
    case "habit":
      return "var(--sage)";
    case "person":
    case "voice":
    case "area":
      return "var(--plum)";
    case "project":
    case "file":
      return "var(--sky)";
    case "note":
    default:
      return "var(--muted)";
  }
}

function labelForKind(kind: string): string {
  if (!kind) return "Item";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/** A short, markdown-stripped one-line preview of the item's content. */
function previewText(item: StoredItem): string {
  const raw = item.summary?.trim() || item.body?.trim() || "";
  if (!raw) return "";
  return raw
    .replace(/[`*_#>]/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function formatRel(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}
