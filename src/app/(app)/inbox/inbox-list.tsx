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
} from "lucide-react";
import {
  useInboxItems,
  updateItem,
  type StoredItem,
} from "@/lib/store/items";

type TabKey = "all" | "note" | "task" | "highlight" | "project";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "note", label: "Notes" },
  { key: "task", label: "Tasks" },
  { key: "highlight", label: "Highlights" },
  { key: "project", label: "Projects" },
];

const DRAG_THRESHOLD = 110;

type IconType = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

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
      {/* Segmented tab bar */}
      <div className="inline-flex items-center gap-1 p-1 rounded-[12px] bg-[var(--paper)] border border-[var(--line)] mb-5 max-w-full overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] text-[13px] font-medium whitespace-nowrap transition ${
                active
                  ? "bg-[var(--paper-2)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
              }`}
            >
              {t.label}
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[17px] px-1 rounded-full text-[10.5px] font-mono font-semibold tabular-nums"
                style={{
                  background: active ? "var(--terra-tint)" : "var(--bg-2)",
                  color: active ? "var(--terra)" : "var(--muted-2)",
                }}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyInbox totalEmpty={rows.length === 0} />
      ) : (
        <ul className="flex flex-col gap-2 life-stagger">
          {filtered.map((it) => (
            <InboxRow key={it.id} item={it} />
          ))}
        </ul>
      )}
    </div>
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
        className="absolute inset-0 rounded-[12px] overflow-hidden flex"
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
          <span className="text-[12px] font-semibold tracking-[0.1em]">
            FILE
          </span>
          <Folder size={14} strokeWidth={1.6} />
        </div>
      </div>

      {/* Card */}
      <div
        className="relative z-[1] life-card life-card-hover px-4 py-3 flex items-center gap-3.5"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform .25s ease, box-shadow .15s",
          opacity,
        }}
      >
        {/* Kind icon tile */}
        <div
          className="grid place-items-center w-[38px] h-[38px] rounded-[10px] shrink-0"
          style={{
            background: `color-mix(in oklch, ${color} 14%, transparent)`,
            border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
            color,
          }}
        >
          <Icon size={17} strokeWidth={1.7} />
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block text-[15px] font-semibold leading-snug text-[var(--ink)] hover:text-[var(--terra)] truncate transition"
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
        <div className="flex items-center gap-1 shrink-0 self-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition">
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
            className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--sage-tint)] hover:text-[var(--sage)] hover:border-[var(--sage)]/30 transition"
          >
            <Folder size={14} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={archive}
            title="Archive"
            aria-label="Archive"
            className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--terra-tint)] hover:text-[var(--terra)] hover:border-[var(--terra)]/30 transition"
          >
            <Archive size={14} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </li>
  );
}

function EmptyInbox({ totalEmpty }: { totalEmpty: boolean }) {
  return (
    <div className="mt-4 rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <InboxIcon size={22} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-medium text-[var(--ink)]">
        {totalEmpty ? "Inbox zero." : "Nothing in this filter."}
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        {totalEmpty
          ? "Nothing to triage. Good rhythm. Press c to capture something new."
          : "Try another kind or capture something new."}
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
