"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ListTodo,
  Flame,
  CalendarDays,
  Bell,
  CreditCard,
  X,
  Plus,
  SlidersHorizontal,
  Check,
  RotateCcw,
  GripVertical,
  Maximize2,
  Minimize2,
  NotebookPen,
  Bookmark,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ArrowRight,
  Disc3,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useRecentItems,
  useItemsOfKind,
  useOldHighlights,
  useOnThisDay,
  useWeekCounts,
  useAllItems,
  captureItem,
  type StoredItem as Item,
} from "@/lib/store/items";
import {
  formatMoney,
  monthlyTotals,
  nextChargeLabel,
  readSubscription,
} from "@/lib/subscriptions";
import { useMusic } from "@/components/music-player";
import { Brief } from "./brief";
import { TodayHero } from "./hero";
import { WeekStrip } from "./week-strip";
import { OnThisDay } from "./on-this-day";
import { SrsHighlight } from "./srs-highlight";
import { WhatNow } from "./what-now";
import { ymd } from "@/lib/ymd";

// ── Widget registry ───────────────────────────────────────────────────────

type WidgetId =
  | "whatNow"
  | "weekStrip"
  | "brief"
  | "agenda"
  | "topTasks"
  | "habits"
  | "music"
  | "quickNote"
  | "notes"
  | "bookmarks"
  | "resurface"
  | "onThisDay"
  | "subscriptions";

const WIDGET_META: Record<WidgetId, string> = {
  whatNow: "What now",
  weekStrip: "Week strip",
  brief: "Daily brief",
  agenda: "Next 7 days",
  topTasks: "Top tasks",
  habits: "Habits to check",
  music: "Music",
  quickNote: "Quick note",
  notes: "Recent notes",
  bookmarks: "Bookmarks",
  resurface: "Resurfaced highlight",
  onThisDay: "On this day",
  subscriptions: "Subscriptions",
};

const ALL_IDS = Object.keys(WIDGET_META) as WidgetId[];

type Width = "half" | "full";
type Placed = { id: WidgetId; w: Width };
type Layout = { items: Placed[]; hidden: WidgetId[] };

const DEFAULT_LAYOUT: Layout = {
  items: [
    { id: "whatNow", w: "full" },
    { id: "weekStrip", w: "full" },
    { id: "brief", w: "half" },
    { id: "agenda", w: "half" },
    { id: "topTasks", w: "half" },
    { id: "habits", w: "half" },
    { id: "music", w: "half" },
    { id: "notes", w: "half" },
    { id: "resurface", w: "half" },
    { id: "onThisDay", w: "half" },
    { id: "subscriptions", w: "half" },
  ],
  hidden: ["quickNote", "bookmarks"],
};

const LS_KEY = "lifeos.today.layout.v2";
const LS_KEY_V1 = "lifeos.today.layout.v1";

function isId(x: unknown): x is WidgetId {
  return typeof x === "string" && (ALL_IDS as string[]).includes(x);
}

function sanitize(rawItems: unknown, rawHidden: unknown): Layout {
  const seen = new Set<WidgetId>();
  const items: Placed[] = [];
  if (Array.isArray(rawItems)) {
    for (const it of rawItems) {
      const id = (it as { id?: unknown })?.id;
      const w: Width = (it as { w?: unknown })?.w === "full" ? "full" : "half";
      if (isId(id) && !seen.has(id)) {
        seen.add(id);
        items.push({ id, w });
      }
    }
  }
  const hidden: WidgetId[] = [];
  if (Array.isArray(rawHidden)) {
    for (const id of rawHidden) {
      if (isId(id) && !seen.has(id)) {
        seen.add(id);
        hidden.push(id);
      }
    }
  }
  // New widgets the saved layout doesn't know about → park in hidden.
  for (const id of ALL_IDS) if (!seen.has(id)) hidden.push(id);
  return { items, hidden };
}

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Layout>;
      return sanitize(parsed.items, parsed.hidden);
    }
    // Migrate the old two-column format if present.
    const v1 = localStorage.getItem(LS_KEY_V1);
    if (v1) {
      const old = JSON.parse(v1) as {
        columns?: [unknown[], unknown[]];
        hidden?: unknown[];
      };
      const flat = [...(old.columns?.[0] ?? []), ...(old.columns?.[1] ?? [])];
      return sanitize(
        flat.map((id) => ({ id, w: "half" })),
        old.hidden,
      );
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LAYOUT;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function relDay(when: Date, startOfToday: Date) {
  const day = new Date(when);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (day.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tmrw";
  return when.toLocaleDateString(undefined, { weekday: "short" });
}

function calcStreak(checkins: Set<string>) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = ymd(new Date(Date.now() - i * 86_400_000));
    if (checkins.has(d)) streak++;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

// ── Page ────────────────────────────────────────────────────────────────────

export function TodayClient() {
  const recent = useRecentItems(24) ?? [];
  const allTasks = useItemsOfKind("task") ?? [];
  const subscriptions = useItemsOfKind("subscription") ?? [];
  const habits = useItemsOfKind("habit") ?? [];
  const notes = useItemsOfKind("note") ?? [];
  const bookmarks = useItemsOfKind("bookmark") ?? [];
  const oldHighlights = useOldHighlights() ?? [];
  const onThisDayRows = useOnThisDay() ?? [];
  const weekCounts = useWeekCounts(7) ?? new Array(7).fill(0);
  const allItems = useAllItems() ?? [];

  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<WidgetId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setLayout(loadLayout());
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, [layout, mounted]);

  // ── Derived data ──
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfWindow = new Date(startOfToday);
  endOfWindow.setDate(endOfWindow.getDate() + 7);

  type Upcoming = {
    id: string;
    title: string;
    kind: string;
    isReminder: boolean;
    when: Date;
  };
  const upcoming: Upcoming[] = [];
  for (const r of allItems) {
    const meta = (r.metadata ?? {}) as {
      dueDate?: string;
      reminder?: boolean;
      completedAt?: string | null;
    };
    let when: Date | null = null;
    if (r.kind === "task" && meta.dueDate && !meta.completedAt) {
      when = new Date(meta.dueDate);
    }
    if (!when) continue;
    if (when < startOfToday || when >= endOfWindow) continue;
    upcoming.push({
      id: r.id,
      title: r.title ?? "untitled",
      kind: r.kind,
      isReminder: r.kind === "task" && meta.reminder === true,
      when,
    });
  }
  upcoming.sort((a, b) => a.when.getTime() - b.when.getTime());

  const openTasks = allTasks.filter((t) => {
    const m = (t.metadata ?? {}) as { completedAt?: string | null };
    return !m.completedAt;
  });

  const today = ymd();
  const habitsDoneToday = habits.filter((h) =>
    ((h.metadata ?? {}) as { checkins?: string[] }).checkins?.includes(today),
  ).length;
  const bestStreak = Math.max(
    0,
    ...habits.map((h) =>
      calcStreak(
        new Set(((h.metadata ?? {}) as { checkins?: string[] }).checkins ?? []),
      ),
    ),
  );

  const activeSubs = subscriptions.filter((s) => s.status !== "archived");

  function isEmpty(id: WidgetId): boolean {
    switch (id) {
      case "resurface":
        return oldHighlights.length === 0;
      case "onThisDay":
        return onThisDayRows.length === 0;
      case "subscriptions":
        return activeSubs.length === 0;
      default:
        return false;
    }
  }

  function renderWidget(id: WidgetId): React.ReactNode {
    switch (id) {
      case "whatNow":
        return <WhatNow tasks={allTasks} habits={habits} decisions={[]} />;
      case "weekStrip":
        return <WeekStrip />;
      case "brief":
        return <Brief recentCount={recent.length} />;
      case "agenda":
        return <AgendaCard upcoming={upcoming} startOfToday={startOfToday} />;
      case "topTasks":
        return <TopTasksCard openTasks={openTasks} />;
      case "habits":
        return <HabitsCard habits={habits} today={today} />;
      case "music":
        return <MusicCard />;
      case "quickNote":
        return <QuickNoteCard />;
      case "notes":
        return <NotesCard notes={notes} />;
      case "bookmarks":
        return <BookmarksCard bookmarks={bookmarks} />;
      case "resurface":
        return <SrsHighlight pool={oldHighlights} />;
      case "onThisDay":
        return <OnThisDay items={onThisDayRows} />;
      case "subscriptions":
        return <SubscriptionsTile items={subscriptions} />;
    }
  }

  // ── Layout mutations ──
  function hideWidget(id: WidgetId) {
    setLayout((prev) => ({
      items: prev.items.filter((p) => p.id !== id),
      hidden: prev.hidden.includes(id) ? prev.hidden : [...prev.hidden, id],
    }));
  }
  function showWidget(id: WidgetId) {
    setLayout((prev) => ({
      items: [...prev.items, { id, w: "half" }],
      hidden: prev.hidden.filter((x) => x !== id),
    }));
  }
  function setWidth(id: WidgetId, w: Width) {
    setLayout((prev) => ({
      ...prev,
      items: prev.items.map((p) => (p.id === id ? { ...p, w } : p)),
    }));
  }
  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const ids = prev.items.map((p) => p.id);
      const from = ids.indexOf(active.id as WidgetId);
      const to = ids.indexOf(over.id as WidgetId);
      if (from === -1 || to === -1) return prev;
      return { ...prev, items: arrayMove(prev.items, from, to) };
    });
  }

  const rendered = editing
    ? layout.items
    : layout.items.filter((p) => !isEmpty(p.id));

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-5">
      <TodayHero
        openTaskCount={openTasks.length}
        habitsDoneToday={habitsDoneToday}
        habitTotal={habits.length}
        streak={bestStreak}
        weekCounts={weekCounts}
      />

      {/* Customize toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {editing ? (
          <>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)] shrink-0">
                Add:
              </span>
              {layout.hidden.length === 0 ? (
                <span className="text-[12px] text-[var(--text-faint)]">
                  All widgets shown
                </span>
              ) : (
                layout.hidden.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => showWidget(id)}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11.5px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
                  >
                    <Plus size={11} />
                    {WIDGET_META[id]}
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLayout(DEFAULT_LAYOUT)}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] transition"
              >
                <RotateCcw size={12} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] px-3 py-1.5 text-[12px] font-medium hover:opacity-90 transition"
              >
                <Check size={13} />
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Your day
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[12px] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition"
            >
              <SlidersHorizontal size={12} />
              Customize
            </button>
          </>
        )}
      </div>

      {/* Widget grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id as WidgetId)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext
          items={rendered.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-5 items-start ${
              editing
                ? "rounded-[16px] p-3 -m-3 bg-[var(--bg-rail)] ring-1 ring-[var(--border-soft)]"
                : ""
            }`}
          >
            {rendered.map((p) => {
              const empty = isEmpty(p.id);
              return (
                <SortableWidget
                  key={p.id}
                  id={p.id}
                  width={p.w}
                  editing={editing}
                  onRemove={() => hideWidget(p.id)}
                  onToggleWidth={() =>
                    setWidth(p.id, p.w === "full" ? "half" : "full")
                  }
                >
                  {empty && editing ? (
                    <EmptyPlaceholder id={p.id} />
                  ) : (
                    renderWidget(p.id)
                  )}
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeId ? (
            <div className="opacity-95 rotate-1" style={{ cursor: "grabbing" }}>
              {renderWidget(activeId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Sortable wrapper ─────────────────────────────────────────────────────────

function SortableWidget({
  id,
  width,
  editing,
  onRemove,
  onToggleWidth,
  children,
}: {
  id: WidgetId;
  width: Width;
  editing: boolean;
  onRemove: () => void;
  onToggleWidth: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !editing });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const dragProps = editing ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${width === "full" ? "lg:col-span-2" : ""} ${
        isDragging ? "opacity-50 z-10" : ""
      } ${editing ? "cursor-grab active:cursor-grabbing touch-none" : ""}`}
      {...dragProps}
    >
      {editing && (
        <>
          <span className="absolute top-2 left-2 z-20 text-[var(--text-faint)] pointer-events-none">
            <GripVertical size={14} />
          </span>
          <div
            className="absolute top-2 right-2 z-20 flex items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onToggleWidth}
              title={width === "full" ? "Make half width" : "Make full width"}
              className="grid place-items-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-soft)] text-[var(--text-faint)] hover:text-[var(--text)] transition"
            >
              {width === "full" ? (
                <Minimize2 size={12} />
              ) : (
                <Maximize2 size={12} />
              )}
            </button>
            <button
              type="button"
              onClick={onRemove}
              title="Remove widget"
              className="grid place-items-center w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-soft)] text-[var(--text-faint)] hover:text-red-500/90 hover:border-red-500/40 transition"
            >
              <X size={12} />
            </button>
          </div>
        </>
      )}
      <div className={editing ? "pointer-events-none select-none" : ""}>
        {children}
      </div>
    </div>
  );
}

// ── New widgets ──────────────────────────────────────────────────────────────

function fmtClock(s: number): string {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function MusicCard() {
  const m = useMusic();
  const t = m.current;
  const pct = m.duration > 0 ? Math.min(100, (m.position / m.duration) * 100) : 0;

  return (
    <div className="life-card relative overflow-hidden p-0">
      {/* music-tab gradient */}
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(130% 130% at 100% 0%, color-mix(in oklch, var(--terra) 20%, var(--paper)) 0%, var(--paper) 60%)",
        }}
      />
      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2">
            <span
              className="grid place-items-center w-6 h-6 rounded-[7px]"
              style={{
                background: "color-mix(in oklch, var(--terra) 15%, transparent)",
                color: "var(--terra)",
              }}
            >
              <Music size={12} />
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)]">
              Music
            </span>
          </h2>
          <Link
            href="/music"
            className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--text-faint)] hover:text-[var(--accent)] transition"
          >
            view
            <ArrowRight size={10} />
          </Link>
        </div>

        {t ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-[10px] overflow-hidden bg-black shrink-0"
                style={{ boxShadow: "var(--shadow-2)" }}
              >
                {t.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-[var(--terra)]">
                    <Music size={18} className="text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-[var(--text)] truncate">
                  {t.title}
                </div>
                <div className="text-[12px] text-[var(--text-muted)] truncate">
                  {t.channel}
                </div>
                {m.source && (
                  <div className="mt-0.5 text-[10.5px] text-[var(--text-faint)] truncate">
                    from {m.source}
                  </div>
                )}
              </div>
              <Equalizer color="var(--terra)" playing={m.isPlaying} />
            </div>

            {/* Progress */}
            <div>
              <button
                type="button"
                aria-label="Seek"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - r.left) / r.width;
                  if (m.duration > 0) m.seek(ratio * m.duration);
                }}
                className="block w-full h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden"
              >
                <span
                  className="block h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, background: "var(--terra)" }}
                />
              </button>
              <div className="mt-1 flex justify-between text-[10px] font-mono tabular-nums text-[var(--text-faint)]">
                <span>{fmtClock(m.position)}</span>
                <span>{fmtClock(m.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={m.prev}
                aria-label="Previous"
                className="grid place-items-center w-8 h-8 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] transition"
              >
                <SkipBack size={16} fill="currentColor" />
              </button>
              <button
                type="button"
                onClick={m.toggle}
                aria-label={m.isPlaying ? "Pause" : "Play"}
                className="grid place-items-center w-10 h-10 rounded-full bg-[var(--terra)] text-white shadow-md hover:scale-105 active:scale-95 transition"
              >
                {m.isPlaying ? (
                  <Pause size={17} fill="currentColor" />
                ) : (
                  <Play size={17} fill="currentColor" className="ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={m.next}
                aria-label="Next"
                className="grid place-items-center w-8 h-8 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] transition"
              >
                <SkipForward size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5 py-1">
            <div
              className="grid place-items-center w-14 h-14 rounded-full shrink-0"
              style={{
                background: "color-mix(in oklch, var(--terra) 12%, transparent)",
                color: "var(--terra)",
              }}
            >
              <Disc3 size={26} strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-[var(--text)]">
                Nothing playing
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">
                Your YouTube Music, one click away.
              </div>
            </div>
            <Link
              href="/music"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--terra)] text-white px-3.5 py-2 text-[12.5px] font-medium hover:opacity-90 transition shrink-0"
            >
              <Play size={13} fill="currentColor" />
              Open
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickNoteCard() {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function save() {
    const t = text.trim();
    if (!t) return;
    const [first, ...rest] = t.split("\n");
    start(async () => {
      try {
        await captureItem({
          kind: "note",
          title: first.slice(0, 120),
          body: rest.join("\n").trim() || null,
          status: "inbox",
        });
        setText("");
        toast.success("Saved to inbox");
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  return (
    <Card icon={NotebookPen} title="Quick note" tint="var(--accent)">
      <div className="rounded-[10px] bg-[var(--bg-rail)] border border-[var(--border-soft)] focus-within:border-[var(--accent)] transition p-2.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              save();
            }
          }}
          rows={3}
          placeholder="Jot something…"
          className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] resize-none focus:outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] text-[var(--text-faint)]">⌘↵ to save</span>
          <button
            type="button"
            onClick={save}
            disabled={pending || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] text-white px-3 py-1 text-[12px] font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            <Plus size={12} />
            Capture
          </button>
        </div>
      </div>
    </Card>
  );
}

function NotesCard({ notes }: { notes: Item[] }) {
  const recent = notes.slice(0, 4);
  return (
    <Card icon={NotebookPen} title="Recent notes" href="/notes" tint="var(--accent)">
      {recent.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">No notes yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((n) => (
            <li key={n.id} className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--accent)]" />
              <Link
                href={`/items/${n.id}`}
                className="text-sm text-[var(--text)] hover:text-[var(--accent)] truncate"
              >
                {n.title?.trim() || "Untitled"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BookmarksCard({ bookmarks }: { bookmarks: Item[] }) {
  const recent = bookmarks.slice(0, 4);
  return (
    <Card icon={Bookmark} title="Bookmarks" href="/bookmarks" tint="var(--terra)">
      {recent.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">No bookmarks yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((b) => {
            const url =
              ((b.metadata ?? {}) as { url?: string }).url ??
              b.sourceUrl ??
              "#";
            return (
              <li key={b.id} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--terra)]" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--text)] hover:text-[var(--accent)] truncate"
                >
                  {b.title?.trim() || "Untitled"}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Widgets that were inline ─────────────────────────────────────────────────

function AgendaCard({
  upcoming,
  startOfToday,
}: {
  upcoming: Array<{
    id: string;
    title: string;
    kind: string;
    isReminder: boolean;
    when: Date;
  }>;
  startOfToday: Date;
}) {
  return (
    <Card icon={CalendarDays} title="Next 7 days" href="/calendar" tint="var(--accent)">
      {upcoming.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">Clear week.</p>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.slice(0, 6).map((u) => (
            <li key={u.id} className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-wide tabular-nums text-[var(--text-faint)] w-10 shrink-0">
                {relDay(u.when, startOfToday)}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: `var(--kind-${u.kind})` }}
              />
              <Link
                href={`/items/${u.id}`}
                className="text-sm text-[var(--text)] hover:text-[var(--accent)] truncate flex-1"
              >
                {u.title}
              </Link>
              {u.isReminder && (
                <Bell size={10} className="text-[var(--accent)] shrink-0" />
              )}
            </li>
          ))}
          {upcoming.length > 6 && (
            <li className="text-[11px] text-[var(--text-faint)] pl-[3.25rem]">
              +{upcoming.length - 6} more
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function TopTasksCard({ openTasks }: { openTasks: Item[] }) {
  return (
    <Card icon={ListTodo} title="Top tasks" href="/tasks" tint="var(--kind-task)">
      {openTasks.slice(0, 5).length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">Nothing pressing.</p>
      ) : (
        <ul className="space-y-1.5">
          {openTasks.slice(0, 5).map((t) => {
            const m = (t.metadata ?? {}) as { priority?: string };
            return (
              <li key={t.id} className="flex items-start gap-2.5">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      m.priority === "high"
                        ? "#ef8b8b"
                        : m.priority === "medium"
                        ? "var(--accent)"
                        : "#6dc8a1",
                  }}
                />
                <Link
                  href={`/items/${t.id}`}
                  className="text-sm text-[var(--text)] hover:text-[var(--accent)] truncate"
                >
                  {t.title}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function HabitsCard({ habits, today }: { habits: Item[]; today: string }) {
  return (
    <Card icon={Flame} title="Habits to check" href="/habits" tint="var(--kind-habit)">
      {habits.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">No habits yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {habits.slice(0, 4).map((h) => {
            const m = (h.metadata ?? {}) as { checkins?: string[] };
            const done = m.checkins?.includes(today);
            return (
              <li key={h.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`w-3 h-3 rounded-sm border ${
                    done
                      ? "bg-[var(--accent)] border-[var(--accent)]"
                      : "border-[var(--border-strong)]"
                  }`}
                />
                <span
                  className={
                    done
                      ? "text-[var(--text-faint)] line-through"
                      : "text-[var(--text)]"
                  }
                >
                  {h.title}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function EmptyPlaceholder({ id }: { id: WidgetId }) {
  return (
    <div className="life-card p-4 border border-dashed border-[var(--border-soft)]">
      <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {WIDGET_META[id]}
      </h2>
      <p className="mt-2 text-[12.5px] text-[var(--text-faint)]">
        Nothing to show today — this widget appears when there&apos;s something
        here.
      </p>
    </div>
  );
}

function SubscriptionsTile({ items }: { items: Item[] }) {
  const active = items.filter((i) => i.status !== "archived");
  if (active.length === 0) return null;

  const totals = monthlyTotals(active);
  const totalsEntries = Object.entries(totals);
  const upcoming = active
    .map((item) => {
      const sub = readSubscription(item);
      return sub?.nextChargeAt
        ? { item, sub, t: new Date(sub.nextChargeAt).getTime() }
        : null;
    })
    .filter(
      (x): x is { item: Item; sub: NonNullable<ReturnType<typeof readSubscription>>; t: number } =>
        x !== null,
    )
    .filter((x) => x.t <= Date.now() + 7 * 86_400_000)
    .sort((a, b) => a.t - b.t)
    .slice(0, 4);

  return (
    <Card icon={CreditCard} title="Subscriptions" href="/subscriptions" tint="var(--gold)">
      <div className="space-y-2">
        {totalsEntries.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--text-muted)]">
            {totalsEntries.map(([currency, monthly]) => (
              <span key={currency} className="tabular-nums">
                <span className="font-semibold text-[var(--text)]">
                  {formatMoney(Math.round(monthly), currency)}
                </span>
                <span className="ml-1 opacity-70">/mo</span>
              </span>
            ))}
          </div>
        )}
        {upcoming.length > 0 ? (
          <ul className="space-y-1.5 mt-2">
            {upcoming.map(({ item, sub }) => (
              <li key={item.id} className="flex items-center gap-2.5 text-sm">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "var(--gold)" }}
                />
                <Link
                  href="/subscriptions"
                  className="text-[var(--text)] hover:text-[var(--accent)] truncate flex-1"
                >
                  {item.title}
                </Link>
                <span className="text-[10.5px] uppercase tracking-wide text-[var(--text-faint)] tabular-nums shrink-0">
                  {formatMoney(sub.amount, sub.currency)} ·{" "}
                  {nextChargeLabel(sub.nextChargeAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-faint)]">
            Nothing renews this week.
          </p>
        )}
      </div>
    </Card>
  );
}

function Card({
  title,
  icon: Icon,
  href,
  tint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
  }>;
  href?: string;
  tint?: string;
  children: React.ReactNode;
}) {
  const color = tint ?? "var(--text-muted)";
  return (
    <div className="life-card p-4 relative overflow-hidden">
      {/* Faint accent wash in the corner so each card has identity */}
      <span
        aria-hidden
        className="absolute right-0 top-0 w-28 h-28 pointer-events-none"
        style={{
          background: `radial-gradient(80% 80% at 100% 0%, color-mix(in oklch, ${color} 12%, transparent), transparent)`,
        }}
      />
      <div className="relative mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px] shrink-0"
            style={{
              background: `color-mix(in oklch, ${color} 15%, transparent)`,
              color,
            }}
          >
            <Icon size={12} />
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)]">
            {title}
          </span>
        </h2>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--text-faint)] hover:text-[var(--accent)] transition"
          >
            view
            <ArrowRight size={10} />
          </Link>
        )}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

// Animated equalizer bars (reuses the .eq-bar keyframes from globals.css).
function Equalizer({ color, playing }: { color: string; playing: boolean }) {
  return (
    <span className="flex items-end gap-[2px] h-4 shrink-0" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={playing ? "eq-bar w-[3px] h-full rounded-full" : "w-[3px] rounded-full"}
          style={{
            background: color,
            height: playing ? "100%" : `${[40, 70, 50, 30][i]}%`,
            animationDelay: `${i * 0.14}s`,
            animationDuration: `${0.7 + (i % 3) * 0.12}s`,
          }}
        />
      ))}
    </span>
  );
}
