"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
  Bookmark,
  NotebookPen,
  ListTodo,
  Lightbulb,
  Sparkles,
  Users,
  Target,
  Flame,
  Sun,
  Quote,
  Mic,
  Folder,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  CornerDownLeft,
} from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { captureItem } from "@/lib/store/items";
import { db } from "@/lib/store/db";

type Kind =
  | "bookmark"
  | "note"
  | "task"
  | "idea"
  | "decision"
  | "person"
  | "highlight"
  | "journal"
  | "habit"
  | "goal"
  | "voice"
  | "project";

const KIND_META: Record<
  Kind,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    tint: string;
  }
> = {
  bookmark: { label: "Bookmark", icon: Bookmark, tint: "var(--kind-bookmark)" },
  note: { label: "Note", icon: NotebookPen, tint: "var(--kind-note)" },
  task: { label: "Task", icon: ListTodo, tint: "var(--kind-task)" },
  idea: { label: "Idea", icon: Lightbulb, tint: "var(--kind-idea)" },
  decision: { label: "Decision", icon: Lightbulb, tint: "var(--kind-decision)" },
  person: { label: "Person", icon: Users, tint: "var(--kind-person)" },
  highlight: { label: "Highlight", icon: Quote, tint: "var(--kind-highlight)" },
  journal: { label: "Journal", icon: Sun, tint: "var(--kind-journal)" },
  habit: { label: "Habit", icon: Flame, tint: "var(--kind-habit)" },
  goal: { label: "Goal", icon: Target, tint: "var(--kind-goal)" },
  voice: { label: "Voice", icon: Mic, tint: "var(--kind-voice)" },
  project: { label: "Project", icon: Folder, tint: "var(--kind-project)" },
};

const PRIMARY: Kind[] = ["bookmark", "note", "task", "idea"];
const SECONDARY: Kind[] = [
  "decision",
  "person",
  "highlight",
  "journal",
  "habit",
  "goal",
  "project",
];
const KIND_CAN_BE_LINKED: Kind[] = [
  "task",
  "note",
  "decision",
  "idea",
  "highlight",
  "bookmark",
];

function looksLikeUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

type ProjectOption = { id: string; title: string | null };

export function QuickCapture() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (!inEditable && e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
      if (open && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        save();
      }
      // Alt+1..4 picks a primary kind without leaving the input
      if (open && e.altKey && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (PRIMARY[idx]) setKind(PRIMARY[idx]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, body, kind, priority]);

  useEffect(() => {
    if (kind !== "bookmark" && looksLikeUrl(title) && title.length > 8) {
      setKind("bookmark");
    }
  }, [title, kind]);

  // Lazy-load project options from the local store
  useEffect(() => {
    if (!open || projects.length > 0) return;
    db.items
      .where("kind")
      .equals("project")
      .toArray()
      .then((rows) =>
        setProjects(rows.map((p) => ({ id: p.id, title: p.title }))),
      )
      .catch(() => {});
  }, [open, projects.length]);

  function reset() {
    setTitle("");
    setBody("");
    setShowAll(false);
    setPriority("medium");
    setProjectId(null);
    setOpen(false);
  }

  const parsed = useMemo(
    () => (kind === "task" ? parseNaturalDate(title) : null),
    [title, kind],
  );
  const cleanTitle = parsed ? parsed.title : title.trim();
  const isBookmarkUrl = kind === "bookmark" && looksLikeUrl(title);

  async function save() {
    if (!title.trim() && !body.trim()) {
      toast.error("Type something to capture");
      return;
    }
    startTransition(async () => {
      const metadata: Record<string, unknown> = {};
      if (kind === "task") {
        metadata.priority = priority;
        metadata.completedAt = null;
        if (parsed) metadata.dueDate = parsed.date.toISOString();
      }
      if (kind === "habit") {
        metadata.cadence = "daily";
        metadata.checkins = [];
      }
      if (kind === "decision") metadata.outcome = "pending";
      if (projectId && KIND_CAN_BE_LINKED.includes(kind)) {
        metadata.projectId = projectId;
      }

      const finalTitle = cleanTitle || title.trim();
      try {
        await captureItem(
          isBookmarkUrl
            ? {
                kind,
                sourceUrl: finalTitle,
                body: body.trim() || null,
                metadata,
              }
            : {
                kind,
                title: finalTitle || null,
                body: body.trim() || null,
                metadata,
              },
        );
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success(`${KIND_META[kind].label} captured`);
      reset();
      router.refresh();
    });
  }

  const activeMeta = KIND_META[kind];
  const ActiveIcon = activeMeta.icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 grid place-items-center w-12 h-12 rounded-full bg-[var(--accent)] text-zinc-950 life-pulse hover:scale-105 active:scale-95 transition"
        aria-label="Quick capture"
        title="Quick capture (press c)"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/75 backdrop-blur-md"
          onClick={reset}
        >
          <div
            className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden life-rise"
            onClick={(e) => e.stopPropagation()}
            style={{
              background:
                "linear-gradient(180deg, #1a1a20 0%, #131318 100%)",
              border: "1px solid #34343f",
              boxShadow:
                "0 40px 80px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(212,168,102,0.08), 0 0 60px -20px rgba(212,168,102,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Top accent bar tinted by kind */}
            <div
              className="h-[3px] w-full"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${activeMeta.tint}40 20%, ${activeMeta.tint} 50%, ${activeMeta.tint}40 80%, transparent 100%)`,
              }}
            />

            {/* Header */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div
                  className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em]"
                  style={{ color: activeMeta.tint }}
                >
                  <ActiveIcon size={12} />
                  New {activeMeta.label.toLowerCase()}
                </div>
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-muted)] transition px-1.5 py-0.5 rounded"
                >
                  {showAll ? (
                    <>
                      Fewer <ChevronUp size={10} />
                    </>
                  ) : (
                    <>
                      More <ChevronDown size={10} />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {PRIMARY.map((k, i) => (
                  <KindTab
                    key={k}
                    kind={k}
                    active={kind === k}
                    onClick={() => setKind(k)}
                    shortcut={i + 1}
                  />
                ))}
              </div>
              {showAll && (
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  {SECONDARY.map((k) => (
                    <KindTab
                      key={k}
                      kind={k}
                      active={kind === k}
                      onClick={() => setKind(k)}
                      small
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Title — clean, big, no visible border. Accent line under input on focus. */}
            <div className="px-6 pb-3 pt-2 border-t border-[var(--border-soft)]">
              <div className="relative">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={placeholderForKind(kind)}
                  className="qc-title peer w-full bg-transparent text-[20px] tracking-tight leading-snug placeholder:text-[var(--text-faint)]/60 outline-none font-medium py-2 text-[var(--text)]"
                />
                <span
                  className="pointer-events-none absolute left-0 right-0 -bottom-px h-px bg-[var(--border-soft)] peer-focus:bg-[var(--accent)] transition-colors"
                />
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-faint)] min-h-[16px]">
                {parsed && (
                  <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                    📅 due {dateLabel(parsed.date)}
                  </span>
                )}
                {isBookmarkUrl && (
                  <span className="inline-flex items-center gap-1 text-[var(--kind-bookmark)]">
                    <LinkIcon size={10} />
                    URL detected
                  </span>
                )}
                {!parsed && !isBookmarkUrl && kind === "task" && (
                  <span className="italic">
                    Hint: end with “friday”, “tomorrow”, “in 3 days” to auto-set due date
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-3 pt-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={bodyPlaceholderForKind(kind)}
                className="qc-body w-full bg-transparent text-[14px] leading-relaxed placeholder:text-[var(--text-faint)]/60 outline-none resize-none py-2 text-[var(--text)]"
              />
            </div>

            {(kind === "task" ||
              (KIND_CAN_BE_LINKED.includes(kind) && projects.length > 0)) && (
              <div className="px-5 pb-3 flex items-center gap-4 flex-wrap">
                {kind === "task" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                      Priority
                    </span>
                    <div className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-rail)] p-0.5">
                      {(["low", "medium", "high"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded transition ${
                            priority === p
                              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                              : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {KIND_CAN_BE_LINKED.includes(kind) && projects.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                      Project
                    </span>
                    <select
                      value={projectId ?? ""}
                      onChange={(e) => setProjectId(e.target.value || null)}
                      className="rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] text-xs px-2 py-1 text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    >
                      <option value="">— none —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title ?? "untitled"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="px-6 py-3 flex items-center justify-between border-t border-[#26262e] bg-[#0e0e12]">
              <div className="flex items-center gap-3 text-[11px] text-[var(--text-faint)]">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles size={11} className="text-[var(--accent)]" />
                  AI enriches in the background
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={reset}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] px-3 py-1.5 rounded-md hover:bg-[var(--bg-card-hover)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] text-zinc-950 px-4 py-1.5 text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 shadow-[0_4px_14px_rgba(212,168,102,0.35)]"
                >
                  Save
                  <kbd className="ml-0.5 text-[10px] opacity-70 inline-flex items-center">
                    <CornerDownLeft size={11} />
                  </kbd>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KindTab({
  kind,
  active,
  onClick,
  small,
  shortcut,
}: {
  kind: Kind;
  active: boolean;
  onClick: () => void;
  small?: boolean;
  shortcut?: number;
}) {
  const Icon = KIND_META[kind].icon;
  const tint = KIND_META[kind].tint;
  return (
    <button
      type="button"
      onClick={onClick}
      title={
        shortcut
          ? `${KIND_META[kind].label} · alt+${shortcut}`
          : KIND_META[kind].label
      }
      className={`relative inline-flex items-center gap-1.5 rounded-md transition ${
        small ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-[13px]"
      } ${
        active
          ? "text-[var(--text)]"
          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5"
      }`}
      style={
        active
          ? {
              background: `color-mix(in oklch, ${tint} 14%, transparent)`,
              boxShadow: `inset 0 -2px 0 0 ${tint}`,
            }
          : undefined
      }
    >
      <Icon size={small ? 11 : 13} style={{ color: active ? tint : undefined }} />
      {KIND_META[kind].label}
      {shortcut && !active && (
        <kbd className="ml-0.5 text-[9px] text-[var(--text-faint)] border border-[var(--border-soft)] rounded px-1 font-mono tabular-nums">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

function placeholderForKind(kind: Kind): string {
  switch (kind) {
    case "bookmark":
      return "Paste a URL or write a title…";
    case "note":
      return "Title (or skip and just write below)";
    case "task":
      return "What needs doing? Try “review proposal friday”";
    case "idea":
      return "What if…";
    case "decision":
      return "What are you deciding?";
    case "person":
      return "Their name";
    case "highlight":
      return "Source (book, article, person)";
    case "journal":
      return "Today's headline";
    case "habit":
      return "Habit name (e.g. Morning walk)";
    case "goal":
      return "What are you aiming at?";
    case "voice":
      return "Voice memo title";
    case "project":
      return "Project name";
  }
}

function bodyPlaceholderForKind(kind: Kind): string {
  switch (kind) {
    case "highlight":
      return "The quote, word-for-word…";
    case "journal":
      return "How was the day? What's on your mind?";
    case "decision":
      return "Reasoning, alternatives, how you'll know it was right…";
    case "task":
      return "Definition of done, context, links…";
    case "person":
      return "Notes about them, last conversation…";
    case "goal":
      return "Why does this matter? What's the metric?";
    case "habit":
      return "Why you want to build it";
    case "project":
      return "Outcome, constraints, first milestone";
    default:
      return "Body, context, links… markdown welcome, use [[wiki]] to link items";
  }
}
