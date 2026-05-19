"use client";

import { useAllItems } from "@/lib/store/items";
import { Network } from "lucide-react";
import { GraphView, type GraphItem } from "./graph-view";

export default function GraphPage() {
  const rows = useAllItems() ?? [];
  const items: GraphItem[] = rows.map((i) => ({
    id: i.id,
    kind: i.kind,
    title: i.title,
    summary: i.summary,
    topic: i.topic,
    body: i.body,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <Network size={18} className="text-[var(--accent)]" />
        Graph
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Items, topics, and the wiki-link connections between them.
      </p>
      <GraphView items={items} />
    </div>
  );
}
