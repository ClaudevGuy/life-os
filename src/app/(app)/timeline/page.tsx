import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import Link from "next/link";

export const metadata = { title: "Timeline · Life OS" };
export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(eq(items.userId, userId))
        .orderBy(desc(items.capturedAt))
        .limit(200),
    [],
  );
  if (rows.length === 0) {
    rows = [...demoUniverse(userId)].sort(
      (a, b) => b.capturedAt.getTime() - a.capturedAt.getTime(),
    );
  }

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = new Date(r.capturedAt).toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(r);
    byDay.set(key, arr);
  }

  const days = [...byDay.entries()].map(([date, items]) => ({ date, items }));

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Timeline</h1>
      <p className="text-sm text-zinc-500 mt-1">
        Everything you&apos;ve captured, in order.
      </p>

      {days.length === 0 ? (
        <div className="mt-8 text-sm text-zinc-600">Nothing yet.</div>
      ) : (
        <div className="mt-8 space-y-8">
          {days.map(({ date, items }) => (
            <section key={date}>
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-3">
                {formatDay(date)}
              </h2>
              <ul className="space-y-1.5 border-l border-zinc-900 pl-5">
                {items.map((it) => (
                  <li key={it.id} className="relative">
                    <span className="absolute -left-[1.45rem] top-2.5 w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    <Link
                      href={`/items/${it.id}`}
                      className="block py-1.5 hover:bg-zinc-950/50 rounded -mx-1 px-1 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                          {it.kind}
                        </span>
                        <span className="text-sm text-zinc-200">
                          {it.title ?? "untitled"}
                        </span>
                      </div>
                      {it.summary && (
                        <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                          {it.summary}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date().toISOString().slice(0, 10);
  if (iso === today) return "Today";
  const ytd = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (iso === ytd) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
