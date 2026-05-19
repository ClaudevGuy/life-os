import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, or, ilike } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Link as LinkIcon } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Resolves a [[wiki link]] to either the matching item (and redirects to /items/:id)
 * or shows a "no match — backlinks" page listing items that mention this name.
 */
export default async function LinkResolverPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const userId = await getViewerId();

  let direct = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            or(eq(items.title, decoded), eq(items.id, decoded)),
          ),
        )
        .limit(1),
    [],
  );
  if (direct.length === 0) {
    const universe = demoUniverse(userId);
    direct = universe.filter(
      (i) =>
        i.id === decoded ||
        (i.title ?? "").toLowerCase() === decoded.toLowerCase(),
    );
  }
  if (direct[0]) redirect(`/items/${direct[0].id}`);

  let mentions = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            or(
              ilike(items.body, `%[[${decoded}]]%`),
              ilike(items.summary, `%${decoded}%`),
            ),
          ),
        )
        .limit(50),
    [],
  );
  if (mentions.length === 0) {
    mentions = demoUniverse(userId).filter((i) =>
      (i.body ?? "").includes(`[[${decoded}]]`),
    );
  }

  if (mentions.length === 0) notFound();

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text)] mb-6"
      >
        <ArrowLeft size={12} /> back
      </Link>

      <h1 className="life-h1 inline-flex items-center gap-2">
        <LinkIcon size={18} className="text-[var(--accent)]" />
        [[{decoded}]]
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        No item with this title yet — but {mentions.length} item
        {mentions.length === 1 ? "" : "s"} mention it.
      </p>

      <ul className="mt-6 space-y-1.5 life-stagger">
        {mentions.map((m) => (
          <li
            key={m.id}
            className="life-card life-card-hover transition"
          >
            <Link href={`/items/${m.id}`} className="block p-3.5">
              <div className="text-sm text-[var(--text)] font-medium">
                {m.title ?? "untitled"}
              </div>
              {m.summary && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">
                  {m.summary}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
