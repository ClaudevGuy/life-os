import { db } from "@/db/client";
import { items } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { BookOpen } from "lucide-react";
import { ReadingList } from "./reading-list";

export const metadata = { title: "Reading · Life OS" };
export const dynamic = "force-dynamic";

export default async function ReadingPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select()
        .from(items)
        .where(and(eq(items.userId, userId), eq(items.kind, "bookmark")))
        .orderBy(desc(items.capturedAt))
        .limit(500),
    [],
  );
  if (rows.length === 0)
    rows = demoUniverse(userId).filter((i) => i.kind === "bookmark");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <BookOpen size={18} className="text-[var(--accent)]" />
        Reading
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Bookmarks, sorted by what&apos;s next.
      </p>

      <ReadingList rows={rows} />
    </div>
  );
}
