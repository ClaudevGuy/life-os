"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PrioritySelect } from "@/components/priority-select";
import {
  Plus,
  NotebookPen,
  ListTodo,
  Sparkles,
  Users,
  Flame,
  Sun,
  Quote,
  Mic,
  Folder,
  MoreHorizontal,
  CornerDownLeft,
  X,
  Flag,
  CalendarClock,
  Hash,
} from "lucide-react";
import { parseNaturalDate, dateLabel } from "@/lib/natural-date";
import { captureItem } from "@/lib/store/items";
import { db } from "@/lib/store/db";

type Kind =
  | "note"
  | "task"
  | "person"
  | "highlight"
  | "journal"
  | "habit"
  | "voice"
  | "project";

const KIND_META: Record<
  Kind,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    tint: string;
    hint: string;
  }
> = {
  note: { label: "Note", icon: NotebookPen, tint: "var(--kind-note)", hint: "Capture a thought — AI enriches it after" },
  task: { label: "Task", icon: ListTodo, tint: "var(--kind-task)", hint: "Add a to-do — natural-language dates work" },
  person: { label: "Person", icon: Users, tint: "var(--kind-person)", hint: "Add someone to your circle" },
  highlight: { label: "Highlight", icon: Quote, tint: "var(--kind-highlight)", hint: "Save a quote worth keeping" },
  journal: { label: "Journal", icon: Sun, tint: "var(--kind-journal)", hint: "Reflect on how the day went" },
  habit: { label: "Habit", icon: Flame, tint: "var(--kind-habit)", hint: "Build a daily streak" },
  voice: { label: "Voice", icon: Mic, tint: "var(--kind-voice)", hint: "Drop a quick voice memo" },
  project: { label: "Project", icon: Folder, tint: "var(--kind-project)", hint: "Start something with an outcome" },
};

const PRIMARY: Kind[] = ["note", "task", "highlight", "project"];
const SECONDARY: Kind[] = ["person", "journal", "habit"];
const KIND_CAN_BE_LINKED: Kind[] = ["task", "note", "highlight"];

type ProjectOption = { id: string; title: string | null };

export function QuickCapture() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [pickedDue, setPickedDue] = useState<{ label: string; date: Date } | null>(null);
  const [topic, setTopic] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pending, startTransition] = useTransition();

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
    setPickedDue(null);
    setTopic("");
    setProjectId(null);
    setOpen(false);
  }

  const parsed = useMemo(
    () => (kind === "task" ? parseNaturalDate(title) : null),
    [title, kind],
  );
  const cleanTitle = parsed ? parsed.title : title.trim();
  const effectiveDue =
    kind === "task" ? parsed?.date ?? pickedDue?.date ?? null : null;

  const words = useMemo(() => {
    const s = `${title} ${body}`.trim();
    return s ? s.split(/\s+/).length : 0;
  }, [title, body]);

  const quickDue = useMemo(() => {
    const base = new Date();
    const mk = (addDays: number) => {
      const d = new Date(base);
      d.setHours(17, 0, 0, 0);
      d.setDate(d.getDate() + addDays);
      return d;
    };
    const weekend = (() => {
      const d = new Date(base);
      d.setHours(17, 0, 0, 0);
      const off = ((6 - d.getDay()) + 7) % 7 || 7;
      d.setDate(d.getDate() + off);
      return d;
    })();
    return [
      { label: "Today", date: mk(0) },
      { label: "Tomorrow", date: mk(1) },
      { label: "Weekend", date: weekend },
      { label: "Next week", date: mk(7) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        if (effectiveDue) metadata.dueDate = effectiveDue.toISOString();
      }
      if (kind === "habit") {
        metadata.cadence = "daily";
        metadata.checkins = [];
      }
      if (projectId && KIND_CAN_BE_LINKED.includes(kind)) {
        metadata.projectId = projectId;
      }

      const finalTitle = cleanTitle || title.trim();
      try {
        await captureItem({
          kind,
          title: finalTitle || null,
          body: body.trim() || null,
          topic: topic.trim().replace(/^#/, "") || null,
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
      if (e.key === "Escape") reset();
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
  }, [open, title, body, kind, priority, pickedDue, topic, projectId]);

  const activeMeta = KIND_META[kind];
  const ActiveIcon = activeMeta.icon;
  const tint = activeMeta.tint;
  const showProject = KIND_CAN_BE_LINKED.includes(kind) && projects.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-hide fixed bottom-6 right-6 z-30 grid place-items-center w-[54px] h-[54px] rounded-[18px] bg-[var(--ink)] text-[var(--paper)] hover:scale-105 active:scale-95 transition"
        style={{ boxShadow: "var(--shadow-3)" }}
        aria-label="Quick capture"
        title="Quick capture (press c)"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-lg overflow-y-auto"
          onClick={reset}
        >
          <div
            className="w-full max-w-[548px] my-auto rounded-[22px] border border-[var(--line-2)] bg-[var(--paper)] overflow-hidden life-rise"
            style={{ boxShadow: "var(--shadow-3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line in the kind tint */}
            <div
              aria-hidden
              className="h-1 w-full transition-[background] duration-500"
              style={{
                background: `linear-gradient(90deg, ${tint}, color-mix(in oklch, ${tint} 30%, transparent))`,
              }}
            />

            {/* Header — compact, light, kind-tinted */}
            <div className="relative px-5 pt-4 pb-3.5">
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none transition-[background] duration-500"
                style={{
                  background: `radial-gradient(130% 130% at 0% 0%, color-mix(in oklch, ${tint} 14%, transparent), transparent 55%)`,
                }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="grid place-items-center w-11 h-11 rounded-[14px] shrink-0 transition-[background,border-color] duration-500"
                    style={{
                      background: `color-mix(in oklch, ${tint} 15%, var(--paper))`,
                      border: `1px solid color-mix(in oklch, ${tint} 32%, transparent)`,
                    }}
                  >
                    <ActiveIcon size={20} style={{ color: tint }} />
                  </div>
                  <div>
                    <div className="text-[15.5px] font-semibold text-[var(--ink)] leading-tight">
                      New {activeMeta.label.toLowerCase()}
                    </div>
                    <div className="text-[12.5px] text-[var(--muted)] leading-snug mt-0.5">
                      {activeMeta.hint}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Close"
                  className="grid place-items-center w-8 h-8 rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Kind selector — tinted chips */}
            <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
              {(showAll ? [...PRIMARY, ...SECONDARY] : PRIMARY).map((k) => {
                const si = PRIMARY.indexOf(k);
                return (
                  <KindChip
                    key={k}
                    kind={k}
                    active={kind === k}
                    onClick={() => setKind(k)}
                    shortcut={si >= 0 ? si + 1 : undefined}
                  />
                );
              })}
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[12.5px] font-medium text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-2)] transition"
                title={showAll ? "Fewer kinds" : "More kinds"}
              >
                <MoreHorizontal size={14} />
                {showAll ? "Less" : "More"}
              </button>
            </div>

            {/* Title + body surface */}
            <div className="px-5 pb-3">
              <div className="rounded-[14px] bg-[var(--paper)] border border-[var(--line-2)] focus-within:border-[var(--terra)] focus-within:shadow-[0_0_0_3px_var(--accent-glow)] transition-all overflow-hidden">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={placeholderForKind(kind)}
                  className="qc-title w-full bg-transparent text-[17px] tracking-tight leading-snug placeholder:text-[var(--muted-2)] outline-none font-medium px-4 pt-3 pb-2 text-[var(--ink)]"
                />
                <div className="h-px bg-[var(--line)] mx-4" />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder={bodyPlaceholderForKind(kind)}
                  className="qc-body w-full bg-transparent text-[13.5px] leading-relaxed placeholder:text-[var(--muted-2)] outline-none resize-none text-[var(--ink-2)] px-4 pt-2.5 pb-3"
                />
              </div>
            </div>

            {/* Properties — aligned, contextual rows */}
            <div className="px-5 pb-4 space-y-1">
              {kind === "task" && (
                <>
                  <MetaRow icon={Flag} label="Priority">
                    <PrioritySelect value={priority} onChange={setPriority} />
                  </MetaRow>
                  <MetaRow icon={CalendarClock} label="Due">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {quickDue.map((q) => {
                        const on = !parsed && pickedDue?.label === q.label;
                        return (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() =>
                              setPickedDue(on ? null : { label: q.label, date: q.date })
                            }
                            className="h-7 px-2.5 rounded-full text-[12px] border transition"
                            style={
                              on
                                ? {
                                    background: "color-mix(in oklch, var(--terra) 15%, var(--paper))",
                                    borderColor: "color-mix(in oklch, var(--terra) 45%, transparent)",
                                    color: "var(--terra)",
                                  }
                                : {
                                    background: "var(--paper)",
                                    borderColor: "var(--line)",
                                    color: "var(--muted)",
                                  }
                            }
                          >
                            {q.label}
                          </button>
                        );
                      })}
                      {effectiveDue && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--terra)] ml-0.5">
                          {dateLabel(effectiveDue)}
                          {parsed && (
                            <span className="text-[var(--muted-2)]">· from title</span>
                          )}
                        </span>
                      )}
                    </div>
                  </MetaRow>
                </>
              )}

              <MetaRow icon={Hash} label="Topic">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Optional — shows in your tag cloud"
                  className="w-full bg-transparent text-[13px] h-7 outline-none text-[var(--ink)] placeholder:text-[var(--muted-2)]"
                />
              </MetaRow>

              {showProject && (
                <MetaRow icon={Folder} label="Project">
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => setProjectId(e.target.value || null)}
                    className="h-8 rounded-full bg-[var(--paper)] border border-[var(--line)] text-[12.5px] px-3 text-[var(--ink-2)] focus:outline-none focus:border-[var(--terra)] max-w-full"
                  >
                    <option value="">— none —</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title ?? "untitled"}
                      </option>
                    ))}
                  </select>
                </MetaRow>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 flex items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--paper-2)]/40">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)] min-w-0">
                <Sparkles size={12} className="text-[var(--terra)] shrink-0" />
                <span className="truncate">AI enriches in the background</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {words > 0 && (
                  <span className="text-[11px] tabular-nums text-[var(--muted-2)] hidden sm:inline">
                    {words} {words === 1 ? "word" : "words"}
                  </span>
                )}
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
                  title="Save · ⌘/Ctrl + Enter"
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

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 min-h-[36px]">
      <div className="flex items-center gap-1.5 w-[80px] shrink-0 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)]">
        <Icon size={12} className="text-[var(--muted-2)]" />
        {label}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function KindChip({
  kind,
  active,
  onClick,
  shortcut,
}: {
  kind: Kind;
  active: boolean;
  onClick: () => void;
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
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium transition-all ${
        active
          ? "text-[var(--ink)]"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
      style={
        active
          ? {
              background: `color-mix(in oklch, ${tint} 18%, var(--paper))`,
              border: `1px solid color-mix(in oklch, ${tint} 42%, transparent)`,
              boxShadow: "var(--shadow-1)",
            }
          : {
              background: "var(--paper)",
              border: "1px solid var(--line)",
            }
      }
    >
      <Icon size={14} style={{ color: tint }} />
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
    case "person":
      return "Their name";
    case "highlight":
      return "Source (book, article, person)";
    case "journal":
      return "Today's headline";
    case "habit":
      return "Habit name (e.g. Morning walk)";
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
    case "task":
      return "Definition of done, context, links…";
    case "person":
      return "Notes about them, last conversation…";
    case "habit":
      return "Why you want to build it";
    case "project":
      return "Outcome, constraints, first milestone";
    default:
      return "Body, context, links… markdown welcome, use [[wiki]] to link items";
  }
}
