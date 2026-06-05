"use client";

import {
  useRef,
  useState,
  useTransition,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { toast } from "sonner";
import type { StoredItem as Item } from "@/lib/store/items";
import {
  updateItem,
  captureItem,
  deleteItem,
  togglePin,
  useItemsOfKind,
} from "@/lib/store/items";
import { Portal } from "@/components/portal";
import { TaskEditDialog } from "./task-edit-dialog";
import {
  LayoutList,
  KanbanSquare,
  Check,
  Repeat,
  Pencil,
  MoreHorizontal,
  AlignLeft,
  ListChecks,
  Pin,
  PinOff,
  Copy,
  RotateCcw,
  Trash2,
} from "lucide-react";

export type Tab = "all" | "today" | "overdue" | "done";
type View = "list" | "board";
type Priority = "high" | "medium" | "low" | "none";

type Subtask = { id: string; text: string; done: boolean };
type TaskMeta = {
  dueDate?: string | null;
  completedAt?: string | null;
  recurrence?: string | null;
  priority?: string | null;
  projectId?: string;
  subtasks?: Subtask[];
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "var(--terra)",
  medium: "var(--gold)",
  low: "var(--sage)",
  none: "var(--muted-2)",
};
const PRIORITY_TINT: Record<Priority, string> = {
  high: "var(--terra-tint)",
  medium: "var(--gold-tint)",
  low: "var(--sage-tint)",
  none: "var(--bg-2)",
};
const PRIORITY_LABEL: Record<Priority, string> = {
  high: "HIGH",
  medium: "MED",
  low: "LOW",
  none: "—",
};

type NameFor = (id?: string) => string | undefined;

export function TasksView({
  rows,
  tab,
  onTabChange,
}: {
  rows: Item[];
  tab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const [view, setView] = useState<View>("board");
  const [editing, setEditing] = useState<Item | null>(null);

  // Resolve project names from the linked projectId (fixes the orphan field).
  const projects = useItemsOfKind("project") ?? [];
  const projMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.title ?? "Project"])),
    [projects],
  );
  const nameFor = useCallback<NameFor>(
    (id) => (id ? projMap.get(id) : undefined),
    [projMap],
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const filtered = rows.filter((t) => {
    const m = (t.metadata ?? {}) as TaskMeta;
    const done = Boolean(m.completedAt) || t.status === "archived";
    if (tab === "done") return done;
    if (done) return false;
    if (tab === "today") {
      if (!m.dueDate) return false;
      const d = new Date(m.dueDate);
      return d >= startOfToday && d < endOfToday;
    }
    if (tab === "overdue") {
      return m.dueDate ? new Date(m.dueDate) < startOfToday : false;
    }
    return true;
  });

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper)] border border-[var(--line)]">
          {(["all", "today", "overdue", "done"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={`px-3.5 py-1.5 rounded-[7px] text-[13px] font-medium capitalize transition ${
                tab === t
                  ? "bg-[var(--paper-2)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper)] border border-[var(--line)]">
          <ViewButton current={view} target="board" onClick={setView} icon={KanbanSquare} />
          <ViewButton current={view} target="list" onClick={setView} icon={LayoutList} />
        </div>
      </div>

      <div className="mt-5">
        {view === "list" ? (
          <ListView rows={filtered} onEdit={setEditing} nameFor={nameFor} />
        ) : (
          <BoardView rows={filtered} onEdit={setEditing} nameFor={nameFor} />
        )}
      </div>

      {editing && (
        <TaskEditDialog task={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ViewButton({
  current,
  target,
  onClick,
  icon: Icon,
}: {
  current: View;
  target: View;
  onClick: (v: View) => void;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  const active = current === target;
  return (
    <button
      type="button"
      onClick={() => onClick(target)}
      aria-label={target}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[13px] font-medium capitalize transition ${
        active
          ? "bg-[var(--paper-2)] text-[var(--ink)]"
          : "text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      <Icon size={13} strokeWidth={1.6} />
      {target}
    </button>
  );
}

/** Sort pinned tasks first, preserving the incoming order otherwise. */
function pinnedFirst(rows: Item[]): Item[] {
  return [...rows].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
}

// ──────────────────────────────────────────────────────────────────────
// Shared completion logic (checkbox + confetti + recurrence respawn)
// ──────────────────────────────────────────────────────────────────────

function useTaskToggle(task: Item) {
  const initialMeta = (task.metadata ?? {}) as TaskMeta;
  const initialDone =
    Boolean(initialMeta.completedAt) || task.status === "archived";
  const [pending, startTransition] = useTransition();
  const [isDone, setIsDone] = useState(initialDone);
  const burstRef = useRef<HTMLSpanElement>(null);

  const toggle = useCallback(() => {
    const next = !isDone;
    setIsDone(next);
    if (next) fireConfetti(burstRef.current);
    startTransition(async () => {
      // Read FRESH metadata so completedAt and every other key survive.
      const m = (task.metadata ?? {}) as TaskMeta;
      await updateItem(task.id, {
        metadata: { ...m, completedAt: next ? new Date().toISOString() : null },
        status: next ? "archived" : "active",
      });
      if (next && m.recurrence) {
        await captureItem({
          kind: "task",
          title: task.title,
          body: task.body,
          topic: task.topic,
          metadata: {
            ...m,
            completedAt: null,
            dueDate: nextOccurrence(m.recurrence, new Date()).toISOString(),
            // Fresh occurrence → fresh checklist (keep the items, clear progress).
            subtasks: (m.subtasks ?? []).map((s) => ({ ...s, done: false })),
          },
        });
      }
    });
  }, [isDone, task]);

  return { isDone, toggle, pending, burstRef };
}

// ──────────────────────────────────────────────────────────────────────
// List view
// ──────────────────────────────────────────────────────────────────────

function ListView({
  rows,
  onEdit,
  nameFor,
}: {
  rows: Item[];
  onEdit: (t: Item) => void;
  nameFor: NameFor;
}) {
  if (rows.length === 0) {
    return (
      <div className="life-card p-8 text-center text-[13px] text-[var(--muted)]">
        Nothing here.
      </div>
    );
  }
  return (
    <div className="life-card overflow-hidden">
      <ul className="divide-y divide-[var(--line)] life-stagger">
        {pinnedFirst(rows).map((t) => (
          <ListRow key={t.id} task={t} onEdit={() => onEdit(t)} nameFor={nameFor} />
        ))}
      </ul>
    </div>
  );
}

function ListRow({
  task,
  onEdit,
  nameFor,
}: {
  task: Item;
  onEdit: () => void;
  nameFor: NameFor;
}) {
  const m = (task.metadata ?? {}) as TaskMeta;
  const priority = (m.priority ?? "none") as Priority;
  const { isDone, toggle, pending, burstRef } = useTaskToggle(task);
  const due = m.dueDate ? new Date(m.dueDate) : null;
  const project = (m.projectId ? nameFor(m.projectId) : undefined) ?? task.topic ?? null;

  return (
    <li
      onClick={onEdit}
      className="group relative flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--paper-2)] cursor-pointer transition overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute left-0 inset-y-0 w-[3px]"
        style={{ background: task.isPinned ? "var(--gold)" : PRIORITY_COLOR[priority] }}
      />
      <Checkbox
        isDone={isDone}
        pending={pending}
        color={PRIORITY_COLOR[priority]}
        size={22}
        burstRef={burstRef}
        onToggle={toggle}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {task.isPinned && <Pin size={11} className="text-[var(--gold)] shrink-0" fill="var(--gold)" />}
          <span
            className={`text-[14.5px] truncate transition ${
              isDone ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"
            }`}
          >
            {task.title?.trim() ? (
              task.title
            ) : (
              <em className="text-[var(--muted-2)] not-italic">untitled</em>
            )}
          </span>
        </div>
        <ContextPreview body={task.body} />
      </div>
      <div className="flex items-center gap-3.5 shrink-0">
        <PriorityPill priority={priority} />
        <ProjectChip label={project} />
        <RecurrenceChip recurrence={m.recurrence} />
        <SubtaskBar subtasks={m.subtasks} />
        <DueChip due={due} />
        <TaskRowMenu task={task} isDone={isDone} onEdit={onEdit} onToggle={toggle} />
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Board view
// ──────────────────────────────────────────────────────────────────────

function BoardView({
  rows,
  onEdit,
  nameFor,
}: {
  rows: Item[];
  onEdit: (t: Item) => void;
  nameFor: NameFor;
}) {
  const cols: Array<{ key: Priority; label: string }> = [
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
    { key: "low", label: "Low" },
  ];
  const byP: Record<string, Item[]> = { high: [], medium: [], low: [], none: [] };
  for (const r of rows) {
    const p = ((r.metadata ?? {}) as TaskMeta).priority ?? "none";
    (byP[p] ?? byP.none).push(r);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cols.map((col) => (
          <BoardColumn
            key={col.key}
            label={col.label}
            priority={col.key}
            tasks={byP[col.key]}
            onEdit={onEdit}
            nameFor={nameFor}
          />
        ))}
      </div>
      {byP.none.length > 0 && (
        <BoardColumn
          label="Unprioritized"
          priority="none"
          tasks={byP.none}
          onEdit={onEdit}
          nameFor={nameFor}
          wide
        />
      )}
    </div>
  );
}

function BoardColumn({
  label,
  priority,
  tasks,
  onEdit,
  nameFor,
  wide,
}: {
  label: string;
  priority: Priority;
  tasks: Item[];
  onEdit: (t: Item) => void;
  nameFor: NameFor;
  wide?: boolean;
}) {
  const color = PRIORITY_COLOR[priority];
  return (
    <div className="life-card p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {label}
        </h3>
        <span className="text-[11.5px] text-[var(--muted-2)] tabular-nums font-mono">
          {tasks.length}
        </span>
      </header>
      <ul
        className={`life-stagger ${
          wide ? "grid grid-cols-1 md:grid-cols-3 gap-2" : "space-y-2"
        }`}
      >
        {tasks.length === 0 && (
          <li className="text-[12px] text-[var(--muted-2)] py-6 text-center border border-dashed border-[var(--line-2)] rounded-[10px]">
            Empty
          </li>
        )}
        {pinnedFirst(tasks).map((t) => (
          <BoardCard
            key={t.id}
            task={t}
            color={color}
            onEdit={() => onEdit(t)}
            nameFor={nameFor}
          />
        ))}
      </ul>
    </div>
  );
}

function BoardCard({
  task,
  color,
  onEdit,
  nameFor,
}: {
  task: Item;
  color: string;
  onEdit: () => void;
  nameFor: NameFor;
}) {
  const m = (task.metadata ?? {}) as TaskMeta;
  const { isDone, toggle, pending, burstRef } = useTaskToggle(task);
  const due = m.dueDate ? new Date(m.dueDate) : null;
  const project = (m.projectId ? nameFor(m.projectId) : undefined) ?? task.topic ?? null;
  const accent = task.isPinned ? "var(--gold)" : color;

  return (
    <li
      onClick={onEdit}
      className="group relative cursor-pointer rounded-[10px] bg-[var(--paper-2)] hover:bg-[var(--paper)] transition overflow-hidden"
    >
      <span aria-hidden className="absolute left-0 inset-y-0 w-[3px]" style={{ background: accent }} />
      <div className="p-3.5 pl-4 flex items-start gap-3">
        <Checkbox
          isDone={isDone}
          pending={pending}
          color={color}
          size={20}
          burstRef={burstRef}
          onToggle={toggle}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {task.isPinned && <Pin size={10} className="text-[var(--gold)] shrink-0" fill="var(--gold)" />}
            <div
              className={`text-[14px] leading-snug truncate transition ${
                isDone ? "text-[var(--muted)] line-through" : "text-[var(--ink)]"
              }`}
            >
              {task.title?.trim() ? (
                task.title
              ) : (
                <em className="text-[var(--muted-2)] not-italic">untitled</em>
              )}
            </div>
          </div>
          <ContextPreview body={task.body} />
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[10.5px]">
            <ProjectChip label={project} />
            <RecurrenceChip recurrence={m.recurrence} />
            <SubtaskBar subtasks={m.subtasks} />
            <DueChip due={due} />
          </div>
        </div>
        <TaskRowMenu task={task} isDone={isDone} onEdit={onEdit} onToggle={toggle} />
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shared card bits
// ──────────────────────────────────────────────────────────────────────

function Checkbox({
  isDone,
  pending,
  color,
  size,
  burstRef,
  onToggle,
  className,
}: {
  isDone: boolean;
  pending: boolean;
  color: string;
  size: number;
  burstRef: React.RefObject<HTMLSpanElement | null>;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      <span ref={burstRef} className="life-confetti pointer-events-none absolute inset-0" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        disabled={pending}
        aria-label={isDone ? "Mark not done" : "Mark done"}
        className="grid place-items-center rounded-[6px] transition"
        style={{
          width: size,
          height: size,
          border: `1.6px solid ${isDone ? "var(--sage)" : color}`,
          background: isDone ? "var(--sage)" : "transparent",
          color: "var(--paper)",
        }}
      >
        {isDone && <Check size={size > 20 ? 13 : 12} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

function ContextPreview({ body }: { body: string | null }) {
  const text = body ? stripMarkdown(body) : "";
  if (!text) return null;
  return (
    <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--muted)] min-w-0">
      <AlignLeft size={11} className="shrink-0 text-[var(--muted-2)]" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function PriorityPill({ priority }: { priority: Priority }) {
  if (priority === "none") return null;
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em] shrink-0"
      style={{ color: PRIORITY_COLOR[priority], background: PRIORITY_TINT[priority] }}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function ProjectChip({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)] truncate max-w-[140px]">
      {label}
    </span>
  );
}

function RecurrenceChip({ recurrence }: { recurrence?: string | null }) {
  if (!recurrence) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[var(--terra)] uppercase tracking-[0.12em] font-semibold text-[10.5px]">
      <Repeat size={10} strokeWidth={1.6} />
      {recurrence}
    </span>
  );
}

function SubtaskBar({ subtasks }: { subtasks?: Subtask[] }) {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.done).length;
  const total = subtasks.length;
  const pct = Math.round((done / total) * 100);
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      <ListChecks size={11} className="text-[var(--muted-2)]" />
      <span className="font-mono tabular-nums text-[10.5px] text-[var(--muted)]">
        {done}/{total}
      </span>
      <span className="w-7 h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-2)" }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--sage)" }} />
      </span>
    </span>
  );
}

function DueChip({ due }: { due: Date | null }) {
  if (!due) return null;
  const { label, color, bold } = dueTone(due);
  return (
    <span
      className={`text-[11px] tracking-[0.04em] font-mono tabular-nums shrink-0 ${bold ? "font-semibold" : ""}`}
      style={{ color }}
    >
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Row "⋯" menu — portal dropdown with inline priority/due setters
// ──────────────────────────────────────────────────────────────────────

function TaskRowMenu({
  task,
  isDone,
  onEdit,
  onToggle,
}: {
  task: Item;
  isDone: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const m = (task.metadata ?? {}) as TaskMeta;
  const priority = (m.priority ?? "none") as Priority;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen((o) => !o);
  }

  async function setPriority(p: Priority) {
    const fresh = (task.metadata ?? {}) as TaskMeta;
    await updateItem(task.id, {
      metadata: { ...fresh, priority: p === "none" ? null : p },
    });
  }
  async function setDue(which: "today" | "tomorrow" | "nextweek" | "clear") {
    let due: string | null = null;
    if (which !== "clear") {
      const d = new Date();
      d.setHours(17, 0, 0, 0);
      if (which === "tomorrow") d.setDate(d.getDate() + 1);
      else if (which === "nextweek") d.setDate(d.getDate() + 7);
      due = d.toISOString();
    }
    const fresh = (task.metadata ?? {}) as TaskMeta;
    await updateItem(task.id, { metadata: { ...fresh, dueDate: due } });
  }
  async function duplicate() {
    const fresh = (task.metadata ?? {}) as TaskMeta;
    await captureItem({
      kind: "task",
      title: task.title,
      body: task.body,
      topic: task.topic,
      metadata: {
        ...fresh,
        completedAt: null,
        subtasks: (fresh.subtasks ?? []).map((s) => ({ ...s, done: false })),
      },
    });
    toast.success("Duplicated");
  }
  async function del() {
    if (!confirm(`Delete "${task.title?.trim() || "this task"}"?`)) return;
    await deleteItem(task.id);
    toast.success("Deleted");
  }

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleMenu}
        aria-label="Task actions"
        className={`grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)] transition shrink-0 self-center ${
          open ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        }`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && pos && (
        <Portal>
          <div
            className="fixed inset-0 z-[60]"
            onClick={close}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="absolute w-[210px] rounded-[12px] border border-[var(--line-2)] bg-[var(--paper)] py-1.5 life-rise"
              style={{ top: pos.top, right: pos.right, boxShadow: "var(--shadow-3)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem
                icon={Pencil}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  onEdit();
                }}
              >
                Edit
              </MenuItem>

              <Divider />
              {/* Priority — inline */}
              <div className="px-3 pt-1 pb-1.5">
                <div className="text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)] mb-1.5">
                  Priority
                </div>
                <div className="flex items-center gap-1">
                  {(["high", "medium", "low", "none"] as Priority[]).map((p) => {
                    const on = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          close();
                          void setPriority(p);
                        }}
                        title={p}
                        className="flex-1 inline-flex items-center justify-center gap-1 h-7 rounded-[7px] text-[10px] font-semibold uppercase tracking-[0.06em] border transition"
                        style={
                          on
                            ? {
                                background: PRIORITY_TINT[p],
                                borderColor: PRIORITY_COLOR[p],
                                color: PRIORITY_COLOR[p],
                              }
                            : { background: "transparent", borderColor: "var(--line)", color: "var(--muted)" }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: PRIORITY_COLOR[p] }}
                        />
                        {p === "none" ? "—" : PRIORITY_LABEL[p]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Due — inline */}
              <div className="px-3 pt-1 pb-1.5">
                <div className="text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)] mb-1.5">
                  Due
                </div>
                <div className="flex items-center gap-1">
                  {(
                    [
                      ["today", "Today"],
                      ["tomorrow", "Tmrw"],
                      ["nextweek", "Next wk"],
                      ["clear", "Clear"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        close();
                        void setDue(k);
                      }}
                      className="flex-1 h-7 rounded-[7px] text-[10.5px] font-medium border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)] transition whitespace-nowrap"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <Divider />
              <MenuItem
                icon={task.isPinned ? PinOff : Pin}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  void togglePin(task.id);
                }}
              >
                {task.isPinned ? "Unpin" : "Pin"}
              </MenuItem>
              <MenuItem
                icon={Copy}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  void duplicate();
                }}
              >
                Duplicate
              </MenuItem>
              <MenuItem
                icon={isDone ? RotateCcw : Check}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  onToggle();
                }}
              >
                {isDone ? "Mark not done" : "Mark done"}
              </MenuItem>

              <Divider />
              <MenuItem
                icon={Trash2}
                danger
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  void del();
                }}
              >
                Delete
              </MenuItem>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

function Divider() {
  return <div className="my-1 h-px bg-[var(--line)]" />;
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-1.5 text-[12.5px] transition ${
        danger
          ? "text-[var(--muted)] hover:text-[var(--bad)] hover:bg-[var(--terra-tint)]"
          : "text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
      }`}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function fireConfetti(el: HTMLSpanElement | null) {
  if (!el) return;
  el.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("span");
    const angle = (Math.PI * 2 * i) / 8;
    const dist = 24 + Math.random() * 12;
    s.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    const hues = ["#D45A3F", "#C8995A", "#7A8B6F", "#6B4E5C", "#6B89A8"];
    s.style.background = hues[i % hues.length];
    el.appendChild(s);
  }
  setTimeout(() => {
    if (el) el.innerHTML = "";
  }, 700);
}

function stripMarkdown(s: string): string {
  const firstLine = s.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return firstLine
    .replace(/[`*_#>]/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

function dueLabel(d: Date): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (d >= start && d < end) return "today";
  const tomorrow = new Date(end);
  tomorrow.setDate(end.getDate() + 1);
  if (d >= end && d < tomorrow) return "tmrw";
  const days = Math.round((d.getTime() - start.getTime()) / 86_400_000);
  if (days >= -6 && days <= 6) {
    return d.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase();
  }
  return d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toLowerCase();
}

/** Color-code due dates: overdue / today / soon / later. */
function dueTone(d: Date): { label: string; color: string; bold: boolean } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const label = dueLabel(d);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
  if (diffDays < 0) return { label, color: "var(--bad)", bold: true };
  if (diffDays === 0) return { label, color: "var(--terra)", bold: false };
  if (diffDays <= 3) return { label, color: "var(--gold)", bold: false };
  return { label, color: "var(--muted-2)", bold: false };
}

function nextOccurrence(recurrence: string, from: Date): Date {
  const next = new Date(from);
  if (recurrence === "daily") next.setDate(next.getDate() + 1);
  else if (recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (recurrence === "monthly") next.setMonth(next.getMonth() + 1);
  else if (recurrence === "weekdays") {
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() === 0 || next.getDay() === 6);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
