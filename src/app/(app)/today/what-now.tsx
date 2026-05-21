import type { StoredItem as Item } from "@/lib/store/items";
import Link from "next/link";
import {
  AlertCircle,
  Flame,
  Lightbulb,
  ListTodo,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ymd } from "@/lib/ymd";

/**
 * Heuristic "next best action" — server-rendered to keep it snappy.
 * Priorities (top wins):
 *   1. Overdue task (any)
 *   2. Habit not checked in today (morning especially)
 *   3. Decision due for review
 *   4. Task due today
 *   5. Caught-up fallback
 */
export function WhatNow({
  tasks,
  habits,
  decisions,
}: {
  tasks: Item[];
  habits: Item[];
  decisions: Item[];
}) {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = ymd(startOfToday);

  // 1. overdue task
  const overdue = tasks
    .filter((t) => {
      const m = (t.metadata ?? {}) as { dueDate?: string; completedAt?: string };
      return !m.completedAt && m.dueDate && new Date(m.dueDate) < startOfToday;
    })
    .sort((a, b) => {
      const ad = new Date(
        ((a.metadata ?? {}) as { dueDate: string }).dueDate,
      ).getTime();
      const bd = new Date(
        ((b.metadata ?? {}) as { dueDate: string }).dueDate,
      ).getTime();
      return ad - bd;
    })[0];

  if (overdue) {
    const dueDate = new Date(
      ((overdue.metadata ?? {}) as { dueDate: string }).dueDate,
    );
    const daysLate = Math.floor(
      (startOfToday.getTime() - dueDate.getTime()) / 86_400_000,
    );
    return (
      <Card
        tint="#ef8b8b"
        icon={AlertCircle}
        eyebrow="What now"
        title="Knock out the overdue one first."
        action={overdue.title ?? "untitled task"}
        href={`/items/${overdue.id}`}
        sub={`${daysLate} day${daysLate === 1 ? "" : "s"} late`}
      />
    );
  }

  // 2. habit not done today (only relevant if it's still morning)
  const hour = now.getHours();
  if (hour < 14) {
    const undone = habits.find((h) => {
      const m = (h.metadata ?? {}) as { checkins?: string[] };
      return !m.checkins?.includes(today);
    });
    if (undone) {
      return (
        <Card
          tint="var(--kind-habit)"
          icon={Flame}
          eyebrow="What now"
          title="Start with the small win."
          action={undone.title ?? "untitled habit"}
          href={`/habits`}
          sub="Check it off and the rest gets easier"
        />
      );
    }
  }

  // 3. decision due for review
  const dueDecision = decisions.find((d) => {
    const m = (d.metadata ?? {}) as { reviewAt?: string; outcome?: string };
    if ((m.outcome ?? "pending") !== "pending") return false;
    return m.reviewAt ? new Date(m.reviewAt) <= now : false;
  });
  if (dueDecision) {
    return (
      <Card
        tint="var(--kind-decision)"
        icon={Lightbulb}
        eyebrow="What now"
        title="Close the loop on a decision."
        action={dueDecision.title ?? "untitled decision"}
        href={`/items/${dueDecision.id}`}
        sub="Five minutes to mark how it played out"
      />
    );
  }

  // 4. task due today
  const dueToday = tasks.find((t) => {
    const m = (t.metadata ?? {}) as { dueDate?: string; completedAt?: string };
    if (m.completedAt) return false;
    if (!m.dueDate) return false;
    const d = new Date(m.dueDate);
    return d >= startOfToday && d.getDate() === now.getDate();
  });
  if (dueToday) {
    const m = (dueToday.metadata ?? {}) as { priority?: string };
    return (
      <Card
        tint="var(--accent)"
        icon={ListTodo}
        eyebrow="What now"
        title="Today's task — get this one shipped."
        action={dueToday.title ?? "untitled task"}
        href={`/items/${dueToday.id}`}
        sub={m.priority ? `${m.priority} priority` : undefined}
      />
    );
  }

  // 5. caught up
  return (
    <Card
      tint="var(--kind-journal)"
      icon={Sparkles}
      eyebrow="What now"
      title="You're caught up."
      action="Capture an idea while it's fresh"
      href="/inbox"
      sub="Or take a walk. Both count."
    />
  );
}

function Card({
  tint,
  icon: Icon,
  eyebrow,
  title,
  action,
  href,
  sub,
}: {
  tint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  eyebrow: string;
  title: string;
  action: string;
  href: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="group block life-card life-card-hover relative overflow-hidden p-5 transition"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklch, ${tint} 8%, var(--bg-card)) 0%, var(--bg-card) 60%)`,
      }}
    >
      <div
        className="absolute -top-px left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${tint}, transparent)`,
        }}
      />
      <div className="flex items-start gap-4">
        <div
          className="grid place-items-center w-10 h-10 rounded-xl shrink-0 transition group-hover:scale-105"
          style={{
            background: `color-mix(in oklch, ${tint} 16%, transparent)`,
            color: tint,
          }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{ color: tint }}
          >
            {eyebrow}
          </div>
          <div className="mt-1 text-[15px] text-[var(--text)] font-medium leading-snug">
            {title}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--text)] group-hover:text-[var(--accent)] transition">
            <span className="truncate max-w-md">{action}</span>
            <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition" />
          </div>
          {sub && (
            <div className="mt-1 text-xs text-[var(--text-muted)]">{sub}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
