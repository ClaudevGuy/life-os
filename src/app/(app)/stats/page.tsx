"use client";

import { useAllItems } from "@/lib/store/items";
import { BarChart3 } from "lucide-react";
import { StatsView, type StatsItem } from "./stats-view";

export default function StatsPage() {
  const rows = useAllItems() ?? [];

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
