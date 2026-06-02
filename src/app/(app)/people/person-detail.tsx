"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Pin,
  Settings,
  Bell,
  Plus,
  Send,
  Mail,
  Phone,
  Clock,
  Users,
  MapPin,
  Calendar,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/store/db";
import {
  updateItem,
  deleteItem,
  captureItem,
  type StoredItem,
} from "@/lib/store/items";
import { InlineBody } from "@/components/inline-edit";
import { RecentTracker } from "@/components/recently-viewed";

type NextStep = { title: string; dueDate?: string };

const STUDIO_PALETTE = [
  "var(--terra)",
  "var(--sage)",
  "var(--gold)",
  "var(--plum)",
  "var(--sky)",
];
const STUDIO_TINTS: Record<string, string> = {
  "var(--terra)": "var(--terra-tint)",
  "var(--sage)": "var(--sage-tint)",
  "var(--gold)": "var(--gold-tint)",
  "var(--plum)": "var(--plum-tint)",
  "var(--sky)": "var(--sky-tint)",
};

function personColor(p: StoredItem): string {
  const m = (p.metadata ?? {}) as { color?: string };
  if (m.color && STUDIO_PALETTE.includes(m.color)) return m.color;
  const seed = p.title ?? p.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return STUDIO_PALETTE[Math.abs(hash) % STUDIO_PALETTE.length];
}

function initials(name: string | null): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PersonDetail({ person }: { person: StoredItem }) {
  const router = useRouter();
  const meta = (person.metadata ?? {}) as {
    relationship?: string;
    role?: string;
    location?: string;
    color?: string;
    email?: string;
    phone?: string;
    birthday?: string;
    metAt?: string;
    lastContactedAt?: string;
    nextStep?: NextStep;
    photos?: string[];
  };
  const color = personColor(person);
  const tint = STUDIO_TINTS[color] ?? "var(--paper-2)";

  // Backlinks-style threads — items whose body mentions [[Person Name]] or
  // [[id]]. Newest first.
  const threads =
    useLiveQuery(async () => {
      const needles = [person.title, person.id].filter(Boolean) as string[];
      if (needles.length === 0) return [];
      const all = await db.items.toArray();
      return all
        .filter(
          (i) =>
            i.id !== person.id &&
            needles.some((n) => (i.body ?? "").includes(`[[${n}]]`)),
        )
        .sort(
          (a, b) =>
            new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
        );
    }, [person.id, person.title]) ?? [];

  const name = person.title?.trim() || "Untitled";

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto pg-enter">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-2 text-[12.5px] text-[var(--muted)] min-w-0">
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition shrink-0"
          >
            <ArrowLeft size={13} strokeWidth={1.6} />
            People
          </Link>
          <span className="text-[var(--muted-2)]" aria-hidden>
            ›
          </span>
          <span className="text-[var(--ink)] font-medium truncate">{name}</span>
        </div>
        <PersonActions
          person={person}
          onDeleted={() => router.push("/people")}
        />
      </div>

      {/* Hero */}
      <section className="life-card overflow-hidden relative">
        {/* Slim color accent */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[4px]"
          style={{
            background: `linear-gradient(90deg, ${color}, color-mix(in oklch, ${color} 55%, white))`,
          }}
        />
        {/* Soft color wash behind the avatar */}
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[280px] pointer-events-none"
          style={{
            background: `linear-gradient(105deg, color-mix(in oklch, ${color} 12%, transparent), transparent)`,
          }}
        />
        <div className="relative px-7 py-6 flex items-center gap-5 flex-wrap">
          {/* Monogram */}
          <div
            className="grid place-items-center w-[72px] h-[72px] rounded-full text-[25px] font-semibold tracking-[-0.01em] shrink-0"
            style={{
              background: tint,
              color,
              border: `1px solid color-mix(in oklch, ${color} 32%, transparent)`,
              boxShadow: "var(--shadow-1)",
            }}
          >
            {initials(person.title)}
          </div>

          {/* Name + facts inline */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[30px] sm:text-[32px] font-semibold tracking-[-0.025em] leading-[1.08] text-[var(--ink)] truncate">
              {name}
            </h1>
            <div className="mt-2 flex items-center gap-2.5 flex-wrap text-[13px] text-[var(--muted)]">
              {meta.relationship && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color, background: tint }}
                >
                  {meta.relationship}
                </span>
              )}
              {meta.role && <span>{meta.role}</span>}
              {meta.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={11} strokeWidth={1.6} />
                  {meta.location}
                </span>
              )}
              {meta.birthday && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={11} strokeWidth={1.6} />
                  {formatBirthday(meta.birthday)}
                </span>
              )}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/items/${person.id}#note`)}
              className="life-btn life-btn-sm life-btn-secondary"
            >
              <Plus size={12} strokeWidth={2} />
              Add note
            </button>
            <ReachOutButton meta={meta} name={name} color={color} />
          </div>
        </div>
      </section>

      {/* Next step */}
      <NextStepCard person={person} />

      {/* Two-column body */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <NotesCard person={person} />
          <ThreadsCard person={person} threads={threads} color={color} />
        </div>
        <div className="flex flex-col gap-6">
          <QuickFactsCard meta={meta} />
          <ReachOutCard meta={meta} />
        </div>
      </div>

      <RecentTracker id={person.id} title={person.title} kind={person.kind} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Actions cluster (pin + delete)
// ──────────────────────────────────────────────────────────────────────

function PersonActions({
  person,
  onDeleted,
}: {
  person: StoredItem;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function togglePin() {
    startTransition(async () => {
      try {
        await updateItem(person.id, { isPinned: !person.isPinned });
        toast.success(person.isPinned ? "Unpinned" : "Pinned");
      } catch {
        toast.error("Couldn't update");
      }
    });
  }

  function del() {
    if (!confirm(`Delete ${person.title}? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteItem(person.id);
        toast.success("Deleted");
        onDeleted();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={togglePin}
        disabled={pending}
        title={person.isPinned ? "Unpin" : "Pin"}
        aria-label={person.isPinned ? "Unpin" : "Pin"}
        className="grid place-items-center w-8 h-8 rounded-[8px] border bg-[var(--paper)] transition"
        style={
          person.isPinned
            ? {
                background: "color-mix(in oklch, var(--gold) 16%, transparent)",
                color: "var(--gold)",
                borderColor:
                  "color-mix(in oklch, var(--gold) 30%, transparent)",
              }
            : {
                borderColor: "var(--line)",
                color: "var(--muted)",
              }
        }
      >
        <Pin size={14} strokeWidth={1.6} />
      </button>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          title="Settings"
          aria-label="Settings"
          className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
        >
          <Settings size={14} strokeWidth={1.6} />
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 w-48 rounded-[10px] border border-[var(--line-2)] bg-[var(--paper)] py-1 z-10"
            style={{ boxShadow: "var(--shadow-2)" }}
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                del();
              }}
              className="w-full text-left px-3 py-2 text-[13px] text-[var(--bad)] hover:bg-[var(--terra-tint)] inline-flex items-center gap-2"
            >
              <Trash2 size={12} strokeWidth={1.6} />
              Delete person
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Reach-out button (picks the first available channel)
// ──────────────────────────────────────────────────────────────────────

function ReachOutButton({
  meta,
  name,
  color,
}: {
  meta: { email?: string; phone?: string };
  name: string;
  color: string;
}) {
  const href = meta.email
    ? `mailto:${meta.email}`
    : meta.phone
    ? `tel:${meta.phone}`
    : null;

  if (!href) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium text-[var(--paper)] opacity-60 cursor-not-allowed"
        style={{ background: color }}
        title="Add an email or phone to reach out"
      >
        <Send size={13} strokeWidth={1.6} />
        Reach out
      </span>
    );
  }

  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[10px] text-[13px] font-medium text-[var(--paper)] hover:brightness-105 transition"
      style={{ background: color }}
    >
      <Send size={13} strokeWidth={1.6} />
      Reach {name.split(" ")[0]}
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Next step
// ──────────────────────────────────────────────────────────────────────

function NextStepCard({ person }: { person: StoredItem }) {
  const meta = (person.metadata ?? {}) as { nextStep?: NextStep };
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(meta.nextStep?.title ?? "");
  const [date, setDate] = useState(meta.nextStep?.dueDate?.slice(0, 10) ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(meta.nextStep?.title ?? "");
    setDate(meta.nextStep?.dueDate?.slice(0, 10) ?? "");
  }, [meta.nextStep]);

  function save() {
    startTransition(async () => {
      try {
        const next: NextStep | undefined = title.trim()
          ? {
              title: title.trim(),
              dueDate: date ? new Date(date).toISOString() : undefined,
            }
          : undefined;
        await updateItem(person.id, {
          metadata: { ...(person.metadata ?? {}), nextStep: next },
        });
        setEditing(false);
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  function clear() {
    startTransition(async () => {
      await updateItem(person.id, {
        metadata: { ...(person.metadata ?? {}), nextStep: undefined },
      });
    });
  }

  const overdueDays = (() => {
    if (!meta.nextStep?.dueDate) return null;
    const d = new Date(meta.nextStep.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    return diff;
  })();
  const overdue = overdueDays !== null && overdueDays > 0;

  if (!meta.nextStep && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-6 w-full rounded-[12px] border border-dashed border-[var(--line-2)] p-4 flex items-center gap-3 text-left hover:bg-[var(--paper-2)] transition"
      >
        <div
          className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
          style={{ background: "var(--bg-2)", color: "var(--muted)" }}
        >
          <Bell size={14} strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
            Next step
          </div>
          <div className="text-[14px] text-[var(--muted)] mt-0.5">
            Plan what comes next.
          </div>
        </div>
      </button>
    );
  }

  return (
    <section
      className="mt-6 rounded-[12px] p-4 flex items-center gap-3 border"
      style={{
        background: overdue ? "var(--terra-tint)" : "var(--paper-2)",
        borderColor: overdue
          ? "color-mix(in oklch, var(--terra) 30%, transparent)"
          : "var(--line)",
      }}
    >
      <div
        className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
        style={{
          background: overdue ? "var(--terra)" : "var(--bg-2)",
          color: overdue ? "var(--paper)" : "var(--muted)",
        }}
      >
        <Bell size={14} strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[10.5px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: overdue ? "var(--terra)" : "var(--muted)" }}
        >
          Next step
        </div>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="Follow up on…"
              className="flex-1 rounded-[8px] bg-[var(--paper)] border border-[var(--line)] px-2.5 py-1.5 text-[14px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-[8px] bg-[var(--paper)] border border-[var(--line)] px-2 py-1.5 text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition"
            />
          </div>
        ) : (
          <div className="text-[15px] text-[var(--ink)] mt-0.5 truncate">
            {meta.nextStep?.title}
          </div>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="life-btn life-btn-sm life-btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="life-btn life-btn-sm life-btn-primary"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          {overdueDays !== null && (
            <span
              className="text-[10.5px] uppercase tracking-[0.14em] font-semibold"
              style={{
                color: overdue ? "var(--terra)" : "var(--muted)",
              }}
            >
              {overdue
                ? `Overdue · ${overdueDays}d`
                : overdueDays === 0
                ? "Today"
                : `In ${-overdueDays}d`}
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={clear}
            className="text-[var(--muted-2)] hover:text-[var(--bad)]"
            aria-label="Clear next step"
            title="Clear"
          >
            <Trash2 size={12} strokeWidth={1.6} />
          </button>
        </div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────────────────────────────

function NotesCard({ person }: { person: StoredItem }) {
  return (
    <section className="life-card p-5">
      <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)] mb-3">
        Notes
      </h3>
      <div className="text-[14px] leading-[1.7] text-[var(--ink-2)]">
        <InlineBody id={person.id} value={person.body} />
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Threads (backlinks-based timeline)
// ──────────────────────────────────────────────────────────────────────

function ThreadsCard({
  person,
  threads,
  color,
}: {
  person: StoredItem;
  threads: StoredItem[];
  color: string;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="life-card p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
          Threads
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="life-btn life-btn-sm life-btn-secondary"
        >
          <Plus size={12} strokeWidth={2} />
          Log
        </button>
      </header>

      {adding && (
        <LogInline
          personTitle={person.title ?? "this person"}
          onDone={() => setAdding(false)}
        />
      )}

      {threads.length === 0 && !adding ? (
        <p className="text-[13px] text-[var(--muted)] italic">
          Nothing logged yet. Tap{" "}
          <span className="font-medium text-[var(--ink)]">Log</span> to start.
        </p>
      ) : (
        <ul className="space-y-3">
          {threads.map((t, i) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 ${
                i < threads.length - 1
                  ? "pb-3 border-b border-dashed border-[var(--line)]"
                  : ""
              }`}
            >
              <div
                className="grid place-items-center w-7 h-7 rounded-full text-[10px] font-semibold tracking-[-0.01em] shrink-0"
                style={{
                  background: STUDIO_TINTS[color] ?? "var(--paper-2)",
                  color,
                  border: `1.4px solid ${color}`,
                }}
              >
                {initials(person.title)}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/items/${t.id}`}
                  className="text-[14px] text-[var(--ink)] hover:text-[var(--terra)] transition leading-relaxed"
                >
                  {t.title ?? t.summary ?? "Untitled"}
                </Link>
                {t.body && !t.title && (
                  <p className="text-[13px] text-[var(--muted)] line-clamp-2 leading-relaxed">
                    {t.body}
                  </p>
                )}
                <div className="mt-1 text-[11px] text-[var(--muted-2)]">
                  {formatRelLong(new Date(t.capturedAt))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LogInline({
  personTitle,
  onDone,
}: {
  personTitle: string;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function save() {
    const t = text.trim();
    if (!t) {
      onDone();
      return;
    }
    startTransition(async () => {
      try {
        // Wiki-link the person so Backlinks/Threads picks it up.
        await captureItem({
          kind: "note",
          title: t.length > 60 ? null : t,
          body: `[[${personTitle}]] — ${t}`,
          status: "active",
        });
        toast.success("Logged");
        setText("");
        onDone();
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  return (
    <div className="mb-4 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] focus-within:border-[var(--terra)] p-3 transition">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          if (e.key === "Escape") onDone();
        }}
        rows={3}
        placeholder="What happened? What was said?"
        className="w-full bg-transparent text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none resize-none leading-relaxed"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10.5px] text-[var(--muted-2)]">⌘↵ to save</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            className="life-btn life-btn-sm life-btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !text.trim()}
            className="life-btn life-btn-sm life-btn-primary"
          >
            Log
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Quick facts + Reach out
// ──────────────────────────────────────────────────────────────────────

function QuickFactsCard({
  meta,
}: {
  meta: {
    metAt?: string;
    location?: string;
    birthday?: string;
    lastContactedAt?: string;
  };
}) {
  const items: { icon: typeof Users; label: string; value: string | null }[] = [
    {
      icon: Users,
      label: "Met",
      value: meta.metAt ?? null,
    },
    {
      icon: MapPin,
      label: "Lives",
      value: meta.location ?? null,
    },
    {
      icon: Calendar,
      label: "Birthday",
      value: meta.birthday ? formatBirthday(meta.birthday) : null,
    },
    {
      icon: Clock,
      label: "Last seen",
      value: meta.lastContactedAt
        ? `${formatRel(new Date(meta.lastContactedAt))} ago`
        : null,
    },
  ];

  const visible = items.filter((i) => i.value);

  if (visible.length === 0) {
    return (
      <section className="life-card p-5">
        <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)] mb-3">
          Quick facts
        </h3>
        <p className="text-[12.5px] text-[var(--muted)] italic">
          Add details — met, lives, birthday — to anchor your memory.
        </p>
      </section>
    );
  }

  return (
    <section className="life-card p-5">
      <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)] mb-3">
        Quick facts
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 items-center">
        {visible.map((row) => (
          <Row key={row.label} icon={row.icon} label={row.label} value={row.value!} />
        ))}
      </dl>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <>
      <dt className="inline-flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        <Icon size={12} strokeWidth={1.6} className="text-[var(--muted-2)]" />
        {label}
      </dt>
      <dd className="text-[14px] text-[var(--ink)]">{value}</dd>
    </>
  );
}

function ReachOutCard({
  meta,
}: {
  meta: { email?: string; phone?: string };
}) {
  if (!meta.email && !meta.phone) return null;
  return (
    <section className="life-card p-5">
      <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)] mb-3">
        Reach out
      </h3>
      <div className="space-y-2">
        {meta.email && (
          <a
            href={`mailto:${meta.email}`}
            className="flex items-center gap-3 rounded-[10px] bg-[var(--paper-2)] hover:bg-[var(--bg-2)] p-3 transition group"
          >
            <div
              className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
              style={{
                background: "var(--terra-tint)",
                color: "var(--terra)",
              }}
            >
              <Mail size={14} strokeWidth={1.6} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                Mail
              </div>
              <div className="text-[13.5px] text-[var(--ink)] truncate">
                {meta.email}
              </div>
            </div>
          </a>
        )}
        {meta.phone && (
          <a
            href={`tel:${meta.phone}`}
            className="flex items-center gap-3 rounded-[10px] bg-[var(--paper-2)] hover:bg-[var(--bg-2)] p-3 transition group"
          >
            <div
              className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
              style={{
                background: "var(--sage-tint)",
                color: "var(--sage)",
              }}
            >
              <Phone size={14} strokeWidth={1.6} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                Phone
              </div>
              <div className="text-[13.5px] text-[var(--ink)] truncate">
                {meta.phone}
              </div>
            </div>
          </a>
        )}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function formatBirthday(raw: string): string {
  // Accept "Dec 10", "1990-12-10", or full ISO.
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Try parse as date
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
  return trimmed;
}

function formatRel(d: Date): string {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

function formatRelLong(d: Date): string {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
