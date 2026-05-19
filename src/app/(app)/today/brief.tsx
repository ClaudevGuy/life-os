"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Newspaper } from "lucide-react";
import { db } from "@/lib/store/db";
import { aiHeaders } from "@/lib/ai-key";

export function Brief({ recentCount }: { recentCount: number }) {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = await db.items
        .where("capturedAt")
        .above(oneDayAgo)
        .reverse()
        .sortBy("capturedAt");

      const allDecisions = await db.items.where("kind").equals("decision").toArray();
      const now = Date.now();
      const dueDecisions = allDecisions.filter((d) => {
        const m = (d.metadata ?? {}) as { reviewAt?: string; outcome?: string };
        if ((m.outcome ?? "pending") !== "pending") return false;
        return m.reviewAt ? new Date(m.reviewAt).getTime() <= now : false;
      });

      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({
          recent: recent.map((i) => ({
            kind: i.kind,
            title: i.title,
            topic: i.topic,
            summary: i.summary,
            body: i.body?.slice(0, 400) ?? null,
          })),
          dueDecisions: dueDecisions.map((d) => ({
            title: d.title,
            body: d.body?.slice(0, 200) ?? null,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to generate brief");
      const data = (await res.json()) as { brief: string };
      setBrief(data.brief);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const tint = "var(--accent)";
  return (
    <div className="life-card p-4 relative overflow-hidden">
      <div
        className="absolute -top-px left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
      />
      <div className="flex items-center justify-between mb-3">
        <h2 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          <Newspaper size={11} style={{ color: tint }} />
          Brief
        </h2>
        <button
          type="button"
          onClick={generate}
          disabled={loading || recentCount === 0}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {brief ? "Regenerate" : "Generate"}
        </button>
      </div>
      {recentCount === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Nothing captured in the last 24 hours. Add something to your inbox first.
        </p>
      ) : brief ? (
        <div className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
          {brief}
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          {recentCount} item{recentCount === 1 ? "" : "s"} captured in the last 24h.
          Click Generate to summarise.
        </p>
      )}
    </div>
  );
}
