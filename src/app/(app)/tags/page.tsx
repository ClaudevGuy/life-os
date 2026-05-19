import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getViewerId, safeQuery } from "@/lib/viewer";
import { DEMO_ITEMS } from "@/lib/demo-data";
import { Tag } from "lucide-react";

export const metadata = { title: "Tags · Life OS" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select({ topic: items.topic })
        .from(items)
        .where(eq(items.userId, userId)),
    [] as { topic: string | null }[],
  );
  if (rows.length === 0) {
    rows = DEMO_ITEMS.map((i) => ({ topic: i.topic }));
  }

  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.topic) continue;
    counts.set(r.topic, (counts.get(r.topic) ?? 0) + 1);
  }
  const tags = [...counts.entries()]
    .map(([topic, n]) => ({ topic, n }))
    .sort((a, b) => b.n - a.n);

  const max = Math.max(...tags.map((t) => t.n), 1);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <Tag size={18} className="text-[var(--accent)]" />
        Tags
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Topics across your captures. Click to filter.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {tags.map((t) => {
          const weight = 0.6 + (t.n / max) * 0.4;
          const size = 0.85 + (t.n / max) * 0.6;
          return (
            <a
              key={t.topic}
              href={`/timeline?topic=${encodeURIComponent(t.topic)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] hover:border-[var(--accent)] px-3 py-1 transition text-[var(--text-muted)] hover:text-[var(--text)]"
              style={{ fontSize: `${size}rem`, opacity: weight }}
            >
              <span>#{t.topic}</span>
              <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
                {t.n}
              </span>
            </a>
          );
        })}
        {tags.length === 0 && (
          <p className="text-sm text-[var(--text-faint)]">
            No tags yet — they appear after AI enriches your captures.
          </p>
        )}
      </div>
    </div>
  );
}
