import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import { safeQuery, demoUniverse } from "@/lib/viewer";
import Link from "next/link";
import { Link as LinkIcon, MessageCircle } from "lucide-react";

export async function Backlinks({
  userId,
  item,
}: {
  userId: string;
  item: { id: string; title: string | null; kind?: string };
}) {
  if (!item.title && !item.id) return null;
  const needles = [item.title, item.id].filter(Boolean) as string[];

  let mentions = await safeQuery(
    () =>
      db
        .select({
          id: items.id,
          title: items.title,
          summary: items.summary,
          kind: items.kind,
        })
        .from(items)
        .where(
          and(
            eq(items.userId, userId),
            or(
              ...needles.map((n) => ilike(items.body, `%[[${n}]]%`)),
            ),
          ),
        )
        .limit(20),
    [] as Array<{ id: string; title: string | null; summary: string | null; kind: string }>,
  );

  if (mentions.length === 0) {
    mentions = demoUniverse(userId)
      .filter((i) =>
        needles.some((n) => (i.body ?? "").includes(`[[${n}]]`)),
      )
      .filter((i) => i.id !== item.id)
      .map((i) => ({
        id: i.id,
        title: i.title,
        summary: i.summary,
        kind: i.kind,
      }));
  }

  if (mentions.length === 0) return null;

  const isPerson = item.kind === "person";
  const heading = isPerson ? "Conversations" : "Backlinks";
  const HeadingIcon = isPerson ? MessageCircle : LinkIcon;

  return (
    <div className="mt-10 life-card p-5">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-1.5">
        <HeadingIcon size={11} />
        {heading} · {mentions.length}
      </h3>
      {isPerson && (
        <p className="text-xs text-[var(--text-muted)] mb-3 -mt-1">
          Notes and items that mention {item.title}.
        </p>
      )}
      <ul className="space-y-2">
        {mentions.map((m) => (
          <li key={m.id}>
            <Link
              href={`/items/${m.id}`}
              className="block rounded-md p-2 -m-2 hover:bg-[var(--bg-card-hover)] transition"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: `var(--kind-${m.kind})` }}
                />
                <span className="text-sm text-[var(--text)]">
                  {m.title ?? "untitled"}
                </span>
              </div>
              {m.summary && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-1 ml-3.5">
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
