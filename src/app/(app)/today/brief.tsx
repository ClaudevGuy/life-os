"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";

export function Brief({ recentCount }: { recentCount: number }) {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/today/brief", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate brief");
      const data = (await res.json()) as { brief: string };
      setBrief(data.brief);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium tracking-tight">Brief</h2>
        <button
          type="button"
          onClick={generate}
          disabled={loading || recentCount === 0}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
        <p className="text-sm text-zinc-600">
          Nothing captured in the last 24 hours. Add something to your inbox first.
        </p>
      ) : brief ? (
        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {brief}
        </div>
      ) : (
        <p className="text-sm text-zinc-600">
          {recentCount} item{recentCount === 1 ? "" : "s"} captured in the last 24h.
          Click Generate to summarise.
        </p>
      )}
    </div>
  );
}
