import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { safeQuery, demoUniverse } from "@/lib/viewer";
import Link from "next/link";
import { FolderKanban } from "lucide-react";

/**
 * Renders the "Linked items" panel on a project's detail page.
 * Pulls every item whose metadata.projectId == this project's id.
 */
export async function ProjectRollUp({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  let linked = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            sql`(${items.metadata} ->> 'projectId') = ${projectId}`,
          ),
        )
        .orderBy(desc(items.capturedAt))
        .limit(100),
    [],
  );
  if (linked.length === 0) {
    linked = demoUniverse(userId).filter(
      (i) => ((i.metadata ?? {}) as { projectId?: string }).projectId === projectId,
    );
  }

  const byKind = new Map<string, typeof linked>();
  for (const i of linked) {
    const arr = byKind.get(i.kind) ?? [];
    arr.push(i);
    byKind.set(i.kind, arr);
  }

  return (
    <div className="mt-10 life-card p-5">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-1.5">
        <FolderKanban size={11} />
        Linked items · {linked.length}
      </h3>
      {linked.length === 0 ? (
        <p className="text-sm text-[var(--text-faint)]">
          Nothing assigned to this project yet. Use the project picker in
          quick-capture (press <kbd className="font-mono text-[10px] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1">c</kbd>) to add tasks, notes, or decisions here.
        </p>
      ) : (
        <div className="space-y-4">
          {[...byKind.entries()].map(([kind, group]) => (
            <div key={kind}>
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)] mb-1.5">
                {kind} · {group.length}
              </div>
              <ul className="space-y-1">
                {group.slice(0, 8).map((it) => (
                  <li key={it.id}>
                    <Link
                      href={`/items/${it.id}`}
                      className="flex items-center gap-2 text-sm rounded-md px-2 py-1 -mx-2 hover:bg-[var(--bg-card-hover)] transition"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: `var(--kind-${it.kind})` }}
                      />
                      <span className="text-[var(--text)] truncate">
                        {it.title ?? "untitled"}
                      </span>
                    </Link>
                  </li>
                ))}
                {group.length > 8 && (
                  <li className="text-[10px] text-[var(--text-faint)] pl-3">
                    +{group.length - 8} more
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
