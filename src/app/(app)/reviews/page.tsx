import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq, gte, and, sql } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { Sparkles, ListTodo, Lightbulb, Target, Flame } from "lucide-react";
import Link from "next/link";
import { WeeklyReviewForm } from "./review-form";

export const metadata = { title: "Reviews · Life OS" };
export const dynamic = "force-dynamic";

function weekKey(d: Date = new Date()) {
  const monday = new Date(d);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default async function ReviewsPage() {
  const userId = await getViewerId();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  let weekItems = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), gte(items.capturedAt, sevenDaysAgo)))
        .limit(500),
    [],
  );
  if (weekItems.length === 0) {
    weekItems = demoUniverse(userId).filter(
      (i) => new Date(i.capturedAt) >= sevenDaysAgo,
    );
  }

  const wk = weekKey();

  // Load any saved review notes for this week
  let savedReview = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            eq(items.kind, "note"),
            sql`(${items.metadata} ->> 'reviewWeek') = ${wk}`,
          ),
        )
        .limit(1),
    [],
  );
  if (savedReview.length === 0) {
    savedReview = demoUniverse(userId).filter(
      (i) =>
        i.kind === "note" &&
        ((i.metadata ?? {}) as { reviewWeek?: string }).reviewWeek === wk,
    );
  }
  const existing = savedReview[0] ?? null;

  const byKind = (k: string) => weekItems.filter((i) => i.kind === k);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <Sparkles size={18} className="text-[var(--accent)]" />
        Weekly review
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Past 7 days. Three prompts. Five minutes.
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger">
        <Stat
          icon={ListTodo}
          label="Tasks done"
          value={
            byKind("task").filter(
              (t) => ((t.metadata ?? {}) as { completedAt?: string }).completedAt,
            ).length
          }
        />
        <Stat icon={Lightbulb} label="Decisions" value={byKind("decision").length} />
        <Stat icon={Target} label="Captures" value={weekItems.length} />
        <Stat icon={Flame} label="Journal entries" value={byKind("journal").length} />
      </div>

      <section className="mt-10">
        <WeeklyReviewForm weekKey={wk} existing={existing} />
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
          This week&apos;s captures
        </h2>
        <ul className="life-card divide-y divide-[var(--border-soft)]">
          {weekItems.slice(0, 12).map((it) => (
            <li key={it.id} className="px-4 py-2.5">
              <Link
                href={`/items/${it.id}`}
                className="flex items-center gap-3 text-sm hover:text-[var(--accent)]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: `var(--kind-${it.kind})` }}
                />
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] w-16">
                  {it.kind}
                </span>
                <span className="truncate">{it.title ?? "untitled"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="life-card p-3.5">
      <div className="flex items-center justify-between text-[var(--text-faint)]">
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
        <Icon size={12} />
      </div>
      <div className="mt-1.5 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
