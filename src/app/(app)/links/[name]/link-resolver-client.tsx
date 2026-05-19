"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Link as LinkIcon } from "lucide-react";

export function LinkResolverClient({ name }: { name: string }) {
  const router = useRouter();
  const result = useLiveQuery(async () => {
    const all = await db.items.toArray();
    const direct =
      all.find(
        (i) =>
          i.id === name ||
          (i.title ?? "").toLowerCase() === name.toLowerCase(),
      ) ?? null;
    if (direct) return { direct, mentions: [] };
    const mentions = all.filter((i) =>
      (i.body ?? "").includes(`[[${name}]]`),
    );
    return { direct: null, mentions };
  }, [name]);

  useEffect(() => {
    if (result?.direct) router.replace(`/items/${result.direct.id}`);
  }, [result?.direct, router]);

  if (!result) return null; // loading
  if (result.direct) return null; // redirecting

  if (result.mentions.length === 0) {
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
          [[{name}]]
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          No item with this title yet, and nothing links to it either.
        </p>
      </div>
    );
  }

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
        [[{name}]]
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        No item with this title yet — but {result.mentions.length} item
        {result.mentions.length === 1 ? "" : "s"} mention it.
      </p>

      <ul className="mt-6 space-y-1.5 life-stagger">
        {result.mentions.map((m) => (
          <li key={m.id} className="life-card life-card-hover transition">
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
