"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Sparkline } from "./charts";
import { fmtPct } from "@/lib/finance";

type UsdData = {
  price: number;
  change: number;
  rangeChange: number;
  points: number[];
};

const RANGES: { key: string; label: string }[] = [
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
];

export function UsdCard() {
  const [range, setRange] = useState("3mo");
  const [data, setData] = useState<UsdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (r: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/markets/usd?range=${r}`, {
        signal,
        cache: "no-store",
      });
      const j = (await res.json()) as Partial<UsdData> & { error?: string };
      if (!res.ok || j.error || !Array.isArray(j.points)) throw new Error("bad");
      setData({
        price: j.price ?? 0,
        change: j.change ?? 0,
        rangeChange: j.rangeChange ?? 0,
        points: j.points,
      });
      setError(false);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    load(range, ctrl.signal);
    return () => ctrl.abort();
  }, [range, load]);

  function refresh() {
    setRefreshing(true);
    load(range);
  }

  const up = (data?.rangeChange ?? 0) >= 0;
  const trend = up ? "var(--sage)" : "var(--bad)";
  const dayUp = (data?.change ?? 0) >= 0;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "3M";

  return (
    <div className="life-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="inline-flex items-center gap-2.5">
          <span
            className="grid place-items-center w-8 h-8 rounded-[9px]"
            style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
          >
            <DollarSign size={16} strokeWidth={1.9} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[14px] font-semibold text-[var(--ink)]">
              US Dollar
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] mt-1">
              DXY index
            </span>
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums transition ${
                  range === r.key
                    ? "bg-[var(--paper)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            title="Refresh"
            aria-label="Refresh"
            className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--terra)] transition"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[128px] rounded-lg bg-[var(--bg-2)] animate-pulse" />
      ) : error || !data ? (
        <div className="h-[128px] grid place-items-center text-center">
          <div>
            <p className="text-[12.5px] text-[var(--muted)]">
              Couldn&apos;t load the dollar index.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-1 text-[11.5px] font-medium text-[var(--terra)] hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[32px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--ink)] leading-none">
                {data.price.toFixed(2)}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums"
                style={{ color: dayUp ? "var(--sage)" : "var(--bad)" }}
              >
                {dayUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {fmtPct(data.change)}
                <span className="text-[9.5px] font-normal text-[var(--muted-2)] uppercase tracking-wide">
                  today
                </span>
              </span>
            </div>
            <span
              className="text-[12px] font-medium tabular-nums"
              style={{ color: trend }}
            >
              {rangeLabel} {fmtPct(data.rangeChange)}
            </span>
          </div>

          <Sparkline
            values={data.points}
            color={trend}
            className="w-full h-24 mt-3"
          />

          <p className="mt-2 text-[11px] text-[var(--muted-2)]">
            The dollar&apos;s strength against a basket of major currencies.
          </p>
        </>
      )}
    </div>
  );
}
