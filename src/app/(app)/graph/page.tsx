import { db } from "@/db/client";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getViewerId, safeQuery, demoUniverse } from "@/lib/viewer";
import { Network } from "lucide-react";
import { GraphView, type GraphItem } from "./graph-view";

export const metadata = { title: "Graph · Life OS" };
export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const userId = await getViewerId();
  let rows = await safeQuery(
    () =>
      db
        .select({
          id: items.id,
          kind: items.kind,
          title: items.title,
          summary: items.summary,
          topic: items.topic,
          body: items.body,
        })
        .from(items)
        .where(eq(items.userId, userId)),
    [] as GraphItem[],
  );
  if (rows.length === 0) {
    rows = demoUniverse(userId).map((i) => ({
      id: i.id,
      kind: i.kind,
      title: i.title,
      summary: i.summary,
      topic: i.topic,
      body: i.body,
    }));
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <Network size={18} className="text-[var(--accent)]" />
        Graph
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Items, topics, and the wiki-link connections between them.
      </p>
      <GraphView items={rows} />
    </div>
  );
}
