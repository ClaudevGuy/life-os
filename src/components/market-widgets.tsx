"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Coins, LineChart, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change: number;
};
type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  currency: string;
};

// ── Data hook ─────────────────────────────────────────────────────────────────
// First load shows a skeleton; the 60s background refresh updates silently so
// prices never flash. Manual refresh spins the icon but keeps the rows visible.

function useMarket<T>(url: string, key: string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // A liveness flag instead of an AbortController: a 60s price refresh has no
  // need to actually cancel the request, and aborting an in-flight fetch on
  // unmount makes the Next dev overlay surface a noisy "AbortError". We just
  // ignore the result if we've since unmounted.
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const j = (await res.json()) as Record<string, unknown>;
      if (!aliveRef.current) return;
      if (!res.ok || j.error || !Array.isArray(j[key])) throw new Error("bad");
      setData(j[key] as T[]);
      setError(false);
    } catch {
      if (aliveRef.current) setError(true);
    } finally {
      if (aliveRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [url, key]);

  useEffect(() => {
    aliveRef.current = true;
    load();
    const t = setInterval(load, 60_000);
    return () => {
      aliveRef.current = false;
      clearInterval(t);
    };
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return { data, loading, error, refreshing, refresh };
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtPrice(n: number, currency = "USD"): string {
  if (n == null || !isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: n >= 1000 ? 0 : 2,
      maximumFractionDigits: n >= 1000 ? 0 : n >= 1 ? 2 : 4,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function MarketCard({
  title,
  icon: Icon,
  tint,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  tint: string;
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <div className="life-card p-4 relative overflow-hidden">
      <span
        aria-hidden
        className="absolute right-0 top-0 w-28 h-28 pointer-events-none"
        style={{
          background: `radial-gradient(80% 80% at 100% 0%, color-mix(in oklch, ${tint} 12%, transparent), transparent)`,
        }}
      />
      <div className="relative mb-3 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px] shrink-0"
            style={{
              background: `color-mix(in oklch, ${tint} 15%, transparent)`,
              color: tint,
            }}
          >
            <Icon size={12} />
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--text-muted)]">
            {title}
          </span>
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh prices"
          aria-label="Refresh prices"
          className="grid place-items-center w-6 h-6 rounded-md text-[var(--text-faint)] hover:text-[var(--accent)] transition"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function Row({
  logo,
  symbol,
  name,
  price,
  change,
  currency,
}: {
  logo?: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  currency?: string;
}) {
  const up = change >= 0;
  const tone = up ? "var(--sage)" : "var(--bad)";
  return (
    <li className="flex items-center gap-2.5 py-[5px]">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          className="w-6 h-6 rounded-full shrink-0"
          loading="lazy"
        />
      ) : (
        <span className="grid place-items-center w-6 h-6 rounded-full bg-[var(--bg-2)] text-[9px] font-bold text-[var(--text-muted)] shrink-0">
          {symbol.slice(0, 2)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-[var(--text)] leading-tight truncate">
          {symbol}
        </div>
        <div className="text-[10.5px] text-[var(--text-faint)] leading-tight truncate">
          {name}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[12.5px] font-medium tabular-nums text-[var(--text)] leading-tight">
          {fmtPrice(price, currency)}
        </div>
        <div
          className="inline-flex items-center gap-0.5 text-[10.5px] font-medium tabular-nums leading-tight"
          style={{ color: tone }}
        >
          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {up ? "+" : ""}
          {change.toFixed(2)}%
        </div>
      </div>
    </li>
  );
}

function Skeleton() {
  return (
    <ul className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-[var(--bg-2)] animate-pulse shrink-0" />
          <span className="h-3 flex-1 rounded bg-[var(--bg-2)] animate-pulse" />
          <span className="h-3 w-12 rounded bg-[var(--bg-2)] animate-pulse shrink-0" />
        </li>
      ))}
    </ul>
  );
}

function Body({
  loading,
  error,
  refresh,
  children,
}: {
  loading: boolean;
  error: boolean;
  refresh: () => void;
  children: ReactNode;
}) {
  if (loading) return <Skeleton />;
  if (error)
    return (
      <div className="py-3 text-center">
        <p className="text-[12.5px] text-[var(--text-faint)]">
          Couldn&apos;t load prices.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-1 text-[11.5px] font-medium text-[var(--accent)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  return <>{children}</>;
}

// ── Widgets ───────────────────────────────────────────────────────────────────

export function CryptoCard() {
  const { data, loading, error, refreshing, refresh } = useMarket<Coin>(
    "/api/markets/crypto",
    "coins",
  );
  return (
    <MarketCard
      title="Crypto"
      icon={Coins}
      tint="var(--gold)"
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Body loading={loading} error={error && !data?.length} refresh={refresh}>
        <ul>
          {data?.map((c) => (
            <Row
              key={c.id}
              logo={c.image}
              symbol={c.symbol}
              name={c.name}
              price={c.price}
              change={c.change}
              currency="USD"
            />
          ))}
        </ul>
      </Body>
    </MarketCard>
  );
}

export function StocksCard() {
  const { data, loading, error, refreshing, refresh } = useMarket<Stock>(
    "/api/markets/stocks",
    "stocks",
  );
  return (
    <MarketCard
      title="Stocks"
      icon={LineChart}
      tint="var(--sky)"
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Body loading={loading} error={error && !data?.length} refresh={refresh}>
        <ul>
          {data?.map((s) => (
            <Row
              key={s.symbol}
              symbol={s.symbol}
              name={s.name}
              price={s.price}
              change={s.change}
              currency={s.currency}
            />
          ))}
        </ul>
      </Body>
    </MarketCard>
  );
}
