import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery } from "@/lib/viewer";
import { demoForKind } from "@/lib/demo-data";
import { Sparkles } from "lucide-react";
import { NewHighlight } from "./new-highlight";

export const metadata = { title: "Highlights · Life OS" };
export const dynamic = "force-dynamic";

export default async function HighlightsPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.kind, "highlight")))
        .orderBy(desc(items.capturedAt))
        .limit(200),
    [],
  );
  if (rows.length === 0) rows = demoForKind("highlight");

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent)]" />
            Highlights
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Lines worth re-reading.
          </p>
        </div>
        <NewHighlight />
      </div>

      <ul className="mt-8 space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-[var(--text-faint)]">
            Capture a highlight by selecting text and saving with kind=highlight.
          </p>
        )}
        {rows.map((h) => {
          const m = (h.metadata ?? {}) as { photos?: string[] };
          const firstPhoto = m.photos?.[0];
          return (
            <li key={h.id} className="life-card overflow-hidden">
              {firstPhoto && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/blobs/${firstPhoto}`}
                  alt=""
                  className="w-full max-h-48 object-cover border-b border-[var(--border-soft)]"
                />
              )}
              <div className="p-5">
                <blockquote className="text-base text-[var(--text)] leading-relaxed">
                  {h.body ?? h.title}
                </blockquote>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-faint)]">
                  {h.title && <span className="italic">— {h.title}</span>}
                  {h.topic && <span>· #{h.topic}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
