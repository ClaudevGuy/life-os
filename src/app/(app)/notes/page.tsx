import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import Link from "next/link";
import { NotebookPen, Pin } from "lucide-react";
import { NewNote } from "./new-note";

export const metadata = { title: "Notes · Life OS" };
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.kind, "note")))
        .orderBy(desc(items.updatedAt))
        .limit(200),
    [],
  );
  if (rows.length === 0) rows = demoUniverse(userId).filter((i) => i.kind === "note");

  const pinned = rows.filter((r) => r.isPinned);
  const others = rows.filter((r) => !r.isPinned);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <NotebookPen size={18} className="text-[var(--accent)]" />
            Notes
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Thoughts, conversation logs, scraps you want to keep.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-faint)]">
            {rows.length} total
          </span>
          <NewNote />
        </div>
      </div>

      {pinned.length > 0 && (
        <section className="mt-8 life-rise">
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
            Pinned
          </h2>
          <NoteGrid rows={pinned} />
        </section>
      )}

      <section className="mt-8 life-rise" style={{ animationDelay: "120ms" }}>
        {pinned.length > 0 && (
          <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
            All notes
          </h2>
        )}
        <NoteGrid rows={others} />
      </section>
    </div>
  );
}

import type { Item } from "@/db/schema";

function NoteGrid({ rows }: { rows: Item[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
      {rows.map((n) => (
        <Link
          key={n.id}
          href={`/items/${n.id}`}
          className="life-card life-card-hover p-4 transition flex flex-col min-h-[140px]"
        >
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-[var(--text)] line-clamp-2 flex-1">
              {n.title ?? "untitled"}
            </span>
            {n.isPinned && (
              <Pin size={11} className="mt-1 shrink-0 text-[var(--accent)] fill-[var(--accent)]" />
            )}
          </div>
          {n.body && (
            <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-4 leading-relaxed">
              {n.body}
            </p>
          )}
          <div className="mt-auto pt-3 flex items-center gap-2 text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
            {n.topic && <span>#{n.topic}</span>}
            <span className="ml-auto">{relDate(n.updatedAt)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function relDate(d: Date) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
