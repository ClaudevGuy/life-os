"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  X,
  Folder,
  ChevronLeft,
  ChevronRight,
  Inbox as InboxIcon,
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
      <div className="inline-flex items-center gap-1.5 p-1 rounded-[12px] bg-[var(--paper)] border border-[var(--line)] mb-5 max-w-full overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-[8px] text-[13px] font-medium whitespace-nowrap transition ${
                active
                  ? "bg-[var(--paper-2)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
              }`}
            >
              {t.label}
              <span
                className="font-mono text-[10.5px] tabular-nums"
                style={{ color: active ? "var(--terra)" : "var(--muted-2)" }}
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
        <ul className="flex flex-col gap-2.5 life-stagger">
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
      // "File" = it's been processed; move out of inbox into active.
      await updateItem(item.id, { status: "active" });
      toast.success("Filed");
    } catch {
      toast.error("Couldn't file");
    }
  }, [item.id]);

  // Pointer drag — handle is the only thing that initiates a drag, so clicks
  // on the title link / action buttons keep working.
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
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
  const dot = kindColor(item.kind);
  const relWhen = formatRel(item.capturedAt).toUpperCase();
  const kindLabel = item.kind.toUpperCase();

  return (
    <li className="relative">
      {/* Action backgrounds (visible while dragging past threshold) */}
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
          <X size={14} strokeWidth={1.6} />
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
        className="relative z-[1] life-card p-[18px] flex items-center gap-3.5"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging
            ? "none"
            : "transform .25s ease, box-shadow .15s",
          opacity,
        }}
      >
        <span
          className="w-[10px] h-[10px] rounded-full shrink-0"
          style={{ background: dot }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/items/${item.id}`}
              className="text-[16px] font-medium text-[var(--ink)] hover:text-[var(--terra)] truncate transition"
            >
              {item.title?.trim() ? (
                item.title
              ) : (
                <em className="text-[var(--muted-2)] not-italic">untitled</em>
              )}
            </Link>
            {!item.summary && (
              <Sparkles
                size={13}
                strokeWidth={1.6}
                className="text-[var(--terra)] shrink-0"
              />
            )}
          </div>
          <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
            {kindLabel} · {relWhen}
          </div>
        </div>

        {/* DRAG handle */}
        <button
          type="button"
          aria-label="Drag to archive or file"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] border border-dashed border-[var(--line-2)] text-[11px] uppercase tracking-[0.1em] font-semibold text-[var(--muted-2)] hover:text-[var(--muted)] cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <ChevronLeft size={11} strokeWidth={1.6} />
          DRAG
          <ChevronRight size={11} strokeWidth={1.6} />
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={archive}
            title="Archive"
            aria-label="Archive"
            className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--terra-tint)] hover:text-[var(--terra)] hover:border-[var(--terra)]/30 transition"
          >
            <X size={13} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={file}
            title="File"
            aria-label="File"
            className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:bg-[var(--sage-tint)] hover:text-[var(--sage)] hover:border-[var(--sage)]/30 transition"
          >
            <Folder size={13} strokeWidth={1.6} />
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
      return "var(--muted-2)";
  }
}

function formatRel(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
