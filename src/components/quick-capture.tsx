"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
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
  MoreHorizontal,
  CornerDownLeft,
} from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { captureItem } from "@/lib/store/items";
import { db } from "@/lib/store/db";

type Kind =
  | "note"
  | "task"
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
  note: { label: "Note", icon: NotebookPen, tint: "var(--kind-note)" },
  task: { label: "Task", icon: ListTodo, tint: "var(--kind-task)" },
  decision: { label: "Decision", icon: Lightbulb, tint: "var(--kind-decision)" },
  person: { label: "Person", icon: Users, tint: "var(--kind-person)" },
  highlight: { label: "Highlight", icon: Quote, tint: "var(--kind-highlight)" },
  journal: { label: "Journal", icon: Sun, tint: "var(--kind-journal)" },
  habit: { label: "Habit", icon: Flame, tint: "var(--kind-habit)" },
  goal: { label: "Goal", icon: Target, tint: "var(--kind-goal)" },
  voice: { label: "Voice", icon: Mic, tint: "var(--kind-voice)" },
  project: { label: "Project", icon: Folder, tint: "var(--kind-project)" },
};

const PRIMARY: Kind[] = ["note", "task", "highlight", "decision"];
const SECONDARY: Kind[] = [
  "person",
  "journal",
  "habit",
  "goal",
  "project",
];
const KIND_CAN_BE_LINKED: Kind[] = [
  "task",
  "note",
  "decision",
  "highlight",
];

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
        await captureItem({
          kind,
          title: finalTitle || null,
          body: body.trim() || null,
          metadata,
        });
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
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-md"
          onClick={reset}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-2xl overflow-hidden life-rise"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Aurora header — base evening gradient + kind-tinted radial wash */}
            <div className="relative h-32 overflow-hidden">
              <div className="absolute inset-0 tod-evening" />
              <div
                className="absolute inset-0 transition-[background] duration-500"
                style={{
                  background: `radial-gradient(ellipse 75% 65% at 50% 45%, color-mix(in oklch, ${activeMeta.tint} 70%, transparent) 0%, transparent 70%)`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)]/40 to-transparent" />
              <div className="absolute inset-0 grid place-items-center">
                <div
                  className="grid place-items-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-md transition-[box-shadow,border-color] duration-500"
                  style={{
                    border: `2px solid ${activeMeta.tint}b3`,
                    boxShadow: `0 10px 30px -8px ${activeMeta.tint}cc, inset 0 1px 0 rgba(255,255,255,0.15)`,
                  }}
                >
                  <ActiveIcon size={24} className="text-white" />
                </div>
              </div>
            </div>

            {/* Centered kind label */}
            <div className="pt-3 pb-4 text-center">
              <div
                className="text-[11px] uppercase tracking-[0.22em] font-semibold transition-colors"
                style={{ color: activeMeta.tint }}
              >
                New {activeMeta.label.toLowerCase()}
              </div>
            </div>

            {/* Kind tabs — segmented pill */}
            <div className="px-6 pb-3 flex justify-center">
              <div className="inline-flex items-center gap-0.5 rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)] p-1 shadow-inner">
                {PRIMARY.map((k, i) => (
                  <KindTab
                    key={k}
                    kind={k}
                    active={kind === k}
                    onClick={() => setKind(k)}
                    shortcut={i + 1}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className={`grid place-items-center w-7 h-7 rounded-full transition ${
                    showAll
                      ? "bg-white/5 text-[var(--text)]"
                      : "text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-white/5"
                  }`}
                  title={showAll ? "Fewer kinds" : "More kinds"}
                  aria-label="More kinds"
                >
                  <MoreHorizontal size={13} />
                </button>
              </div>
            </div>
            {showAll && (
              <div className="px-6 pb-3 flex justify-center">
                <div className="inline-flex items-center gap-0.5 rounded-full bg-[var(--bg-rail)]/60 border border-[var(--border-soft)] p-1 flex-wrap">
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
              </div>
            )}

            {/* Title + Body combined input surface */}
            <div className="px-6 pt-2 pb-4">
              <div className="rounded-xl bg-[var(--bg-rail)] border border-[var(--border-soft)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)] transition-all overflow-hidden">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={placeholderForKind(kind)}
                  className="qc-title w-full bg-transparent text-[18px] tracking-tight leading-snug placeholder:text-[var(--text-faint)] outline-none font-medium px-4 pt-3 pb-2 text-[var(--text)]"
                />
                <div className="h-px bg-[var(--border-soft)]/60 mx-4" />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder={bodyPlaceholderForKind(kind)}
                  className="qc-body w-full bg-transparent text-[13.5px] leading-relaxed placeholder:text-[var(--text-faint)] outline-none resize-none text-[var(--text)] px-4 pt-2.5 pb-3"
                />
              </div>
              <div className="mt-2 px-1 flex items-center gap-3 text-[11px] text-[var(--text-faint)] min-h-[16px]">
                {parsed && (
                  <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                    📅 due {dateLabel(parsed.date)}
                  </span>
                )}
                {!parsed && kind === "task" && (
                  <span className="italic">
                    Try “review proposal friday”, “call mom tomorrow”, “ship in 3 days”
                  </span>
                )}
              </div>
            </div>

            {(kind === "task" ||
              (KIND_CAN_BE_LINKED.includes(kind) && projects.length > 0)) && (
              <div className="px-7 pb-4 flex items-center justify-center gap-4 flex-wrap">
                {kind === "task" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                      Priority
                    </span>
                    <div className="inline-flex items-center gap-0.5 rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)] p-0.5">
                      {(["low", "medium", "high"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full transition ${
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
                      className="rounded-full bg-[var(--bg-rail)] border border-[var(--border-soft)] text-xs px-3 py-1 text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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

            {/* Footer */}
            <div className="px-6 py-3.5 flex items-center justify-between border-t border-[var(--border-soft)]">
              <div className="inline-flex items-center gap-1.5 text-[10px] text-[var(--text-faint)]">
                <Sparkles size={11} className="text-[var(--accent)]" />
                AI enriches in the background
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="life-btn life-btn-sm life-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending}
                  className="life-btn life-btn-primary"
                >
                  Save
                  <kbd className="text-[10px] opacity-70 inline-flex items-center">
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
      className={`relative inline-flex items-center gap-1.5 rounded-full transition-all ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12.5px] font-medium"
      } ${
        active
          ? "text-zinc-950"
          : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/[0.04]"
      }`}
      style={
        active
          ? {
              background: tint,
              boxShadow: `0 4px 14px -4px ${tint}80`,
            }
          : undefined
      }
    >
      <Icon
        size={small ? 11 : 13}
        style={{ color: active ? undefined : tint }}
      />
      {KIND_META[kind].label}
    </button>
  );
}

function placeholderForKind(kind: Kind): string {
  switch (kind) {
    case "note":
      return "Title (or skip and just write below)";
    case "task":
      return "What needs doing? Try “review proposal friday”";
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
