import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { BarChart3 } from "lucide-react";
import { StatsView, type StatsItem } from "./stats-view";

export const metadata = { title: "Stats · Life OS" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () => db.select().from(items).where(eq(items.userId, userId)),
    [],
  );
  if (rows.length === 0) rows = demoUniverse(userId);

  const data: StatsItem[] = rows.map((i) => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    topic: i.topic,
    capturedAt: new Date(i.capturedAt),
    metadata: (i.metadata ?? {}) as Record<string, unknown>,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <BarChart3 size={18} className="text-[var(--accent)]" />
        Stats
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        How your second brain is filling up.
      </p>
      <StatsView items={data} />
    </div>
  );
}
