"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DollarSign, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Sparkline } from "./charts";
import { fmtPct } from "@/lib/finance";

type UsdData = {
  price: number;
  change: number;
  rangeChange: number;
  points: number[];
};

type Quote = { key: string; opt: string; name: string; sym: string };

const QUOTES: Quote[] = [
  { key: "dxy", opt: "Dollar Index (DXY)", name: "DXY index", sym: "" },
  { key: "EUR", opt: "Euro · USD/EUR", name: "USD / EUR", sym: "€" },
  { key: "ILS", opt: "Shekel · USD/ILS", name: "USD / ILS", sym: "₪" },
  { key: "GBP", opt: "Pound · USD/GBP", name: "USD / GBP", sym: "£" },
  { key: "JPY", opt: "Yen · USD/JPY", name: "USD / JPY", sym: "¥" },
  { key: "CHF", opt: "Franc · USD/CHF", name: "USD / CHF", sym: "Fr " },
  { key: "CAD", opt: "Can$ · USD/CAD", name: "USD / CAD", sym: "C$" },
];

const RANGES: { key: string; label: string }[] = [
  { key: "1mo", label: "1M" },
  { key: "3mo", label: "3M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1Y" },
];

function fmtValue(price: number, sym: string): string {
  const dec = price >= 50 ? 2 : price >= 1 ? 3 : 4;
  return `${sym}${price.toFixed(dec)}`;
}

export function UsdCard() {
  const [pair, setPair] = useState("dxy");
  const [range, setRange] = useState("3mo");
  const [data, setData] = useState<UsdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (p: string, r: string, ok: () => boolean) => {
      try {
        const res = await fetch(`/api/markets/usd?pair=${p}&range=${r}`, {
          cache: "no-store",
        });
        const j = (await res.json()) as Partial<UsdData> & { error?: string };
        if (!ok()) return;
        if (!res.ok || j.error || !Array.isArray(j.points))
          throw new Error("bad");
        setData({
          price: j.price ?? 0,
          change: j.change ?? 0,
          rangeChange: j.rangeChange ?? 0,
          points: j.points,
        });
        setError(false);
      } catch {
        if (ok()) setError(true);
      } finally {
        if (ok()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  // Alive across the component's life (StrictMode-safe): the mount sets it true,
  // the throwaway dev unmount sets it false, the real remount sets it true.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    // Ignore the result if a newer pair/range superseded it, or we unmounted —
    // a liveness flag instead of aborting, so the dev overlay stays quiet.
    load(pair, range, () => aliveRef.current && !ignore);
    return () => {
      ignore = true;
    };
  }, [pair, range, load]);

  function refresh() {
    setRefreshing(true);
    load(pair, range, () => aliveRef.current);
  }

  const quote = QUOTES.find((q) => q.key === pair) ?? QUOTES[0];
  const isDxy = pair === "dxy";
  const up = (data?.rangeChange ?? 0) >= 0;
  const trend = up ? "var(--sage)" : "var(--bad)";
  const dayUp = (data?.change ?? 0) >= 0;
  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "3M";

  return (
    <div className="life-card p-5">
      {/* Header: title + currency selector */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="inline-flex items-center gap-2.5 min-w-0">
          <span
            className="grid place-items-center w-8 h-8 rounded-[9px] shrink-0"
            style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
          >
            <DollarSign size={16} strokeWidth={1.9} />
          </span>
          <span className="flex flex-col leading-none min-w-0">
            <span className="text-[14px] font-semibold text-[var(--ink)]">
              US Dollar
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] mt-1 truncate">
              {quote.name}
            </span>
          </span>
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              aria-label="Compare against"
              className="appearance-none rounded-[9px] bg-[var(--paper-2)] border border-[var(--line)] pl-3 pr-7 py-1.5 text-[12.5px] font-medium text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition cursor-pointer"
            >
              {QUOTES.map((q) => (
                <option key={q.key} value={q.key}>
                  {q.opt}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-2)] text-[10px]">
              ▾
            </span>
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
              Couldn&apos;t load this rate.
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
          {/* Value + range */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <span className="text-[32px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--ink)] leading-none">
                {fmtValue(data.price, quote.sym)}
              </span>
              <span
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold tabular-nums shrink-0"
                style={{ color: dayUp ? "var(--sage)" : "var(--bad)" }}
              >
                {dayUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {fmtPct(data.change)}
                <span className="text-[9.5px] font-normal text-[var(--muted-2)] uppercase tracking-wide">
                  today
                </span>
              </span>
            </div>
            <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full bg-[var(--paper-2)] border border-[var(--line)] shrink-0">
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
          </div>

          <Sparkline
            values={data.points}
            color={trend}
            className="w-full h-24 mt-3"
          />

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-[var(--muted-2)]">
              {isDxy
                ? "Dollar strength vs a basket of major currencies."
                : `How many ${pair} one US dollar buys.`}
            </span>
            <span className="font-medium tabular-nums" style={{ color: trend }}>
              {rangeLabel} {fmtPct(data.rangeChange)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
