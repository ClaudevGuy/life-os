import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery } from "@/lib/viewer";
import { demoForKind } from "@/lib/demo-data";
import { Sun } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Journal · Life OS" };
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.kind, "journal")))
        .orderBy(desc(items.capturedAt))
        .limit(200),
    [],
  );
  if (rows.length === 0) rows = demoForKind("journal");

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <Sun size={18} className="text-[var(--accent)]" />
        Journal
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Daily notes, energy and mood, in your own words.
      </p>

      <ul className="mt-8 space-y-3">
        {rows.length === 0 && (
          <li className="text-sm text-[var(--text-faint)]">
            Write your first entry from <Link href="/today" className="text-[var(--accent)]">Today</Link>.
          </li>
        )}
        {rows.map((j) => {
          const m = (j.metadata ?? {}) as {
            energy?: number;
            mood?: string;
            photos?: string[];
          };
          const firstPhoto = m.photos?.[0];
          return (
            <li key={j.id} className="life-card life-card-hover transition">
              <Link href={`/items/${j.id}`} className="block p-5">
                <div className="flex gap-4">
                  {firstPhoto && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/blobs/${firstPhoto}`}
                      alt=""
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover shrink-0 border border-[var(--border-soft)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-faint)] flex-wrap">
                      <span>
                        {new Date(j.capturedAt).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {m.mood && <span className="text-base">{m.mood}</span>}
                      {m.energy != null && (
                        <span className="inline-flex items-center gap-1">
                          energy
                          <span className="font-mono text-[var(--text-muted)]">
                            {m.energy}/5
                          </span>
                        </span>
                      )}
                      {m.photos && m.photos.length > 1 && (
                        <span className="text-[var(--text-faint)]">
                          · {m.photos.length} photos
                        </span>
                      )}
                    </div>
                    {j.body && (
                      <p className="mt-3 text-sm text-[var(--text)] leading-relaxed line-clamp-4 whitespace-pre-wrap">
                        {j.body}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
