"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import {
  Wallet,
  Landmark,
  Banknote,
  PiggyBank,
  Home,
  Car,
  CreditCard,
  Coins,
  LineChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Building2,
  Scale,
} from "lucide-react";
import { useItemsOfKind, type StoredItem } from "@/lib/store/items";
import { useSnapshots, recordSnapshot } from "@/lib/store/snapshots";
import {
  readAccount,
  readHolding,
  summarize,
  convert,
  fmtMoney,
  fmtPct,
  fmtQty,
  currencySymbol,
  CURRENCIES,
  type AccountMeta,
  type HoldingMeta,
  type FinLine,
  type FxRates,
} from "@/lib/finance";
import {
  readSubscription,
  monthlyEquivalent,
  formatMoney,
  nextChargeLabel,
} from "@/lib/subscriptions";
import { CryptoCard, StocksCard } from "@/components/market-widgets";
import { ymd } from "@/lib/ymd";
import { Donut, Sparkline } from "./charts";
import { NewAccountButton, AccountModal } from "./account-modal";
import { NewHoldingButton, HoldingModal } from "./holding-modal";

type IconCmp = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

// Category → colour + icon. Tokens keep it dark-mode safe; a few colours repeat
// across rare categories, but any realistic allocation reads as distinct slices.
const CAT_META: Record<string, { color: string; icon: IconCmp }> = {
  Cash: { color: "var(--sage)", icon: Banknote },
  Checking: { color: "var(--sky)", icon: Wallet },
  Savings: { color: "var(--sage)", icon: PiggyBank },
  Investments: { color: "var(--terra)", icon: TrendingUp },
  Retirement: { color: "var(--plum)", icon: PiggyBank },
  Crypto: { color: "var(--gold)", icon: Coins },
  "Real estate": { color: "var(--terra)", icon: Home },
  Vehicle: { color: "var(--sky)", icon: Car },
  "Other asset": { color: "var(--muted)", icon: Wallet },
  "Credit card": { color: "var(--bad)", icon: CreditCard },
  Loan: { color: "var(--bad)", icon: Landmark },
  Mortgage: { color: "var(--bad)", icon: Home },
  "Other debt": { color: "var(--bad)", icon: Scale },
};
function catColor(c: string): string {
  return CAT_META[c]?.color ?? "var(--muted)";
}
function catIcon(c: string): IconCmp {
  return CAT_META[c]?.icon ?? Wallet;
}

type Quotes = {
  crypto: Record<string, { price: number; change: number }>;
  stocks: Record<string, { price: number; change: number; currency: string }>;
};

type AccountView = {
  item: StoredItem;
  meta: AccountMeta;
  baseAmount: number | null;
};

type HoldingView = {
  item: StoredItem;
  meta: HoldingMeta;
  price: number | null;
  change: number | null;
  valueUsd: number | null;
  valueBase: number | null;
  pnlUsd: number | null;
  pnlPct: number | null;
};

const BASE_KEY = "lifeos.finance.base";

export default function FinancePage() {
  const accounts = (useItemsOfKind("account") ?? []) as StoredItem[];
  const holdings = (useItemsOfKind("holding") ?? []) as StoredItem[];
  const subscriptions = (useItemsOfKind("subscription") ?? []) as StoredItem[];
  const snapshots = useSnapshots() ?? [];

  const [mounted, setMounted] = useState(false);
  const [base, setBase] = useState("USD");
  const [fx, setFx] = useState<FxRates | null>(null);
  const [quotes, setQuotes] = useState<Quotes | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesRefreshing, setQuotesRefreshing] = useState(false);
  const [quoteNonce, setQuoteNonce] = useState(0);

  const [editingAccount, setEditingAccount] = useState<StoredItem | null>(null);
  const [editingHolding, setEditingHolding] = useState<StoredItem | null>(null);

  // Load / persist base currency.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BASE_KEY);
      if (saved) setBase(saved);
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(BASE_KEY, base);
    } catch {
      /* ignore */
    }
  }, [base, mounted]);

  // FX rates for the chosen base.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(`/api/markets/fx?base=${base}`, {
          signal: ctrl.signal,
        });
        const j = (await r.json()) as Partial<FxRates> & { error?: string };
        if (j && j.rates && j.base) {
          setFx({ base: j.base, date: j.date ?? null, rates: j.rates });
        }
      } catch (e) {
        if ((e as Error)?.name !== "AbortError") setFx(null);
      }
    })();
    return () => ctrl.abort();
  }, [base]);

  // Live quotes for holdings.
  const coinIds = useMemo(
    () =>
      Array.from(
        new Set(
          holdings
            .map((h) => readHolding(h))
            .filter((m): m is HoldingMeta => m?.assetClass === "crypto")
            .map((m) => m.coinId)
            .filter((x): x is string => Boolean(x)),
        ),
      ),
    [holdings],
  );
  const stockSymbols = useMemo(
    () =>
      Array.from(
        new Set(
          holdings
            .map((h) => readHolding(h))
            .filter((m): m is HoldingMeta => m?.assetClass === "stock")
            .map((m) => m.symbol),
        ),
      ),
    [holdings],
  );
  const coinKey = coinIds.join(",");
  const symKey = stockSymbols.join(",");

  useEffect(() => {
    if (!coinKey && !symKey) {
      setQuotes({ crypto: {}, stocks: {} });
      setQuotesLoading(false);
      setQuotesRefreshing(false);
      return;
    }
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const r = await fetch(
          `/api/markets/quote?coins=${encodeURIComponent(
            coinKey,
          )}&stocks=${encodeURIComponent(symKey)}`,
          { signal: ctrl.signal, cache: "no-store" },
        );
        const j = (await r.json()) as Quotes;
        setQuotes({ crypto: j.crypto ?? {}, stocks: j.stocks ?? {} });
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      } finally {
        setQuotesLoading(false);
        setQuotesRefreshing(false);
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      ctrl.abort();
      clearInterval(t);
    };
  }, [coinKey, symKey, quoteNonce]);

  function refreshQuotes() {
    setQuotesRefreshing(true);
    setQuoteNonce((n) => n + 1);
  }

  // ── Derived views ──
  const accountViews = useMemo<AccountView[]>(() => {
    return accounts
      .map((item) => {
        const meta = readAccount(item);
        if (!meta) return null;
        return {
          item,
          meta,
          baseAmount: convert(meta.balance, meta.currency, base, fx),
        };
      })
      .filter((x): x is AccountView => x !== null);
  }, [accounts, base, fx]);

  const holdingViews = useMemo<HoldingView[]>(() => {
    return holdings
      .map((item) => {
        const meta = readHolding(item);
        if (!meta) return null;
        const q =
          meta.assetClass === "crypto" && meta.coinId
            ? quotes?.crypto[meta.coinId]
            : meta.assetClass === "stock"
              ? quotes?.stocks[meta.symbol]
              : undefined;
        const price = q?.price ?? null;
        const change = q?.change ?? null;
        const valueUsd = price != null ? price * meta.quantity : null;
        const valueBase =
          valueUsd != null ? convert(valueUsd, "USD", base, fx) : null;
        const pnlUsd =
          valueUsd != null && meta.costBasis != null
            ? valueUsd - meta.costBasis
            : null;
        const pnlPct =
          pnlUsd != null && meta.costBasis
            ? (pnlUsd / meta.costBasis) * 100
            : null;
        return {
          item,
          meta,
          price,
          change,
          valueUsd,
          valueBase,
          pnlUsd,
          pnlPct,
        };
      })
      .filter((x): x is HoldingView => x !== null);
  }, [holdings, quotes, base, fx]);

  // Lines for the net-worth summary.
  const lines = useMemo<FinLine[]>(() => {
    const out: FinLine[] = [];
    for (const a of accountViews) {
      out.push({
        id: a.item.id,
        bucket: a.meta.accountType,
        category: a.meta.category,
        amount: a.meta.balance,
        currency: a.meta.currency,
      });
    }
    for (const h of holdingViews) {
      if (h.valueUsd == null) continue;
      out.push({
        id: h.item.id,
        bucket: "asset",
        category: h.meta.assetClass === "crypto" ? "Crypto" : "Investments",
        amount: h.valueUsd,
        currency: "USD",
      });
    }
    return out;
  }, [accountViews, holdingViews]);

  const summary = useMemo(() => summarize(lines, base, fx), [lines, base, fx]);

  const hasData = accounts.length > 0 || holdings.length > 0;
  const pricesReady = !quotesLoading;

  // Record a daily snapshot once figures are real.
  useEffect(() => {
    if (!mounted || !hasData) return;
    if (holdings.length > 0 && !pricesReady) return;
    recordSnapshot({
      base,
      net: summary.net,
      assets: summary.assets,
      liabilities: summary.liabilities,
    }).catch(() => {});
  }, [
    mounted,
    hasData,
    pricesReady,
    base,
    holdings.length,
    summary.net,
    summary.assets,
    summary.liabilities,
  ]);

  // Trend + change, from snapshots in the current base.
  const { trendValues, changeAbs, changePct, changeWindow } = useMemo(() => {
    const baseSnaps = snapshots.filter((s) => s.base === base);
    const values = baseSnaps.slice(-30).map((s) => s.net);
    if (values.length > 0) values[values.length - 1] = summary.net;
    let changeAbs: number | null = null;
    let changePct: number | null = null;
    let changeWindow = "";
    if (baseSnaps.length >= 2) {
      const cutoff = Date.parse(ymd(new Date(Date.now() - 30 * 86_400_000)));
      const older = baseSnaps.filter((s) => Date.parse(s.date) <= cutoff);
      const prior = older.length
        ? older[older.length - 1]
        : baseSnaps[0];
      changeAbs = summary.net - prior.net;
      changePct = prior.net !== 0 ? (changeAbs / Math.abs(prior.net)) * 100 : null;
      changeWindow = older.length ? "30d" : "all time";
    }
    return { trendValues: values, changeAbs, changePct, changeWindow };
  }, [snapshots, base, summary.net]);

  const totalHoldingsBase = holdingViews.reduce(
    (acc, h) => acc + (h.valueBase ?? 0),
    0,
  );

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto pg-enter space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Wallet size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
            Finance
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Your whole financial picture — net worth, accounts, holdings and
            what recurs — in one calm place.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <BaseSelect base={base} onChange={setBase} />
          <NewHoldingButton />
          <NewAccountButton />
        </div>
      </header>

      {!hasData ? (
        <EmptyHero />
      ) : (
        <>
          <NetWorthHero
            base={base}
            summary={summary}
            trendValues={trendValues}
            changeAbs={changeAbs}
            changePct={changePct}
            changeWindow={changeWindow}
            valuing={holdings.length > 0 && quotesLoading}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <AllocationCard base={base} summary={summary} />
            <RecurringCard
              base={base}
              fx={fx}
              subscriptions={subscriptions}
            />
          </div>

          <AccountsCard
            views={accountViews}
            base={base}
            onEdit={setEditingAccount}
          />

          <HoldingsCard
            views={holdingViews}
            base={base}
            totalBase={totalHoldingsBase}
            loading={quotesLoading}
            refreshing={quotesRefreshing}
            onRefresh={refreshQuotes}
            onEdit={setEditingHolding}
          />
        </>
      )}

      {/* Markets reference */}
      <div>
        <SectionLabel icon={LineChart}>Markets</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <CryptoCard />
          <StocksCard />
        </div>
      </div>

      {editingAccount && (
        <AccountModal
          existing={editingAccount}
          onClose={() => setEditingAccount(null)}
        />
      )}
      {editingHolding && (
        <HoldingModal
          existing={editingHolding}
          onClose={() => setEditingHolding(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Header bits
// ──────────────────────────────────────────────────────────────────────

function BaseSelect({
  base,
  onChange,
}: {
  base: string;
  onChange: (c: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--paper)] pl-3 pr-1.5 py-1 text-[12px] text-[var(--muted)]">
      <span className="uppercase tracking-[0.12em] text-[10.5px] font-semibold">
        Base
      </span>
      <select
        value={base}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[13px] font-medium text-[var(--ink)] focus:outline-none appearance-none cursor-pointer pr-1"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: IconCmp;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <Icon size={14} strokeWidth={1.7} className="text-[var(--muted)]" />
      <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--muted)]">
        {children}
      </span>
      <span className="flex-1 h-px bg-[var(--line)]" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Net-worth hero
// ──────────────────────────────────────────────────────────────────────

function NetWorthHero({
  base,
  summary,
  trendValues,
  changeAbs,
  changePct,
  changeWindow,
  valuing,
}: {
  base: string;
  summary: ReturnType<typeof summarize>;
  trendValues: number[];
  changeAbs: number | null;
  changePct: number | null;
  changeWindow: string;
  valuing: boolean;
}) {
  const positive = (changeAbs ?? 0) >= 0;
  return (
    <section className="life-card p-6 relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "var(--terra)" }}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6 items-center">
        {/* Left: number + change + asset/liability split */}
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
            Net worth · {base}
          </div>
          <div className="mt-1.5 flex items-end gap-3 flex-wrap">
            <div
              className="font-mono tabular-nums tracking-[-0.03em] leading-none text-[var(--ink)]"
              style={{ fontSize: 52, fontWeight: 600 }}
            >
              {fmtMoney(summary.net, base)}
            </div>
            {changeAbs != null && (
              <span
                className="inline-flex items-center gap-1 mb-1 text-[12.5px] font-semibold tabular-nums px-2 py-0.5 rounded-full"
                style={{
                  color: positive ? "var(--sage)" : "var(--bad)",
                  background: positive ? "var(--sage-tint)" : "var(--terra-tint)",
                }}
              >
                {positive ? (
                  <ArrowUpRight size={13} strokeWidth={2} />
                ) : (
                  <ArrowDownRight size={13} strokeWidth={2} />
                )}
                {fmtMoney(Math.abs(changeAbs), base, { compact: true })}
                {changePct != null && <span>· {fmtPct(changePct)}</span>}
                <span className="opacity-70 font-normal">{changeWindow}</span>
              </span>
            )}
          </div>

          {valuing && (
            <div className="mt-2 text-[11.5px] text-[var(--muted)] inline-flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" />
              Valuing holdings…
            </div>
          )}

          {/* Assets vs liabilities split bar */}
          <div className="mt-5 max-w-md">
            <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg-2)]">
              <div
                style={{
                  width: `${barShare(summary.assets, summary.liabilities)}%`,
                  background: "var(--sage)",
                }}
              />
              <div
                style={{
                  width: `${100 - barShare(summary.assets, summary.liabilities)}%`,
                  background: "var(--bad)",
                }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-4">
              <SplitStat
                color="var(--sage)"
                label="Assets"
                value={fmtMoney(summary.assets, base, { compact: true })}
              />
              <SplitStat
                color="var(--bad)"
                label="Liabilities"
                value={fmtMoney(summary.liabilities, base, { compact: true })}
                align="right"
              />
            </div>
          </div>

          {summary.unconverted > 0 && (
            <p className="mt-3 text-[11px] text-[var(--muted-2)]">
              {summary.unconverted} balance
              {summary.unconverted === 1 ? "" : "s"} in an unsupported currency
              aren&apos;t included.
            </p>
          )}
        </div>

        {/* Right: trend */}
        <div className="min-w-0">
          {trendValues.length >= 2 ? (
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2 flex items-center gap-1.5">
                <TrendingUp size={12} strokeWidth={1.7} />
                Trend · last {trendValues.length} days
              </div>
              <Sparkline
                values={trendValues}
                color="var(--terra)"
                className="w-full h-[88px]"
              />
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[var(--line-2)] h-full min-h-[120px] grid place-items-center px-5 text-center">
              <div>
                <LineChart
                  size={22}
                  strokeWidth={1.5}
                  className="text-[var(--muted-2)] mx-auto mb-2"
                />
                <p className="text-[12.5px] text-[var(--muted)]">
                  Your net-worth trend draws itself here as the days go by.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function barShare(assets: number, liabilities: number): number {
  const total = assets + liabilities;
  if (total <= 0) return 100;
  return Math.max(4, Math.min(96, (assets / total) * 100));
}

function SplitStat({
  color,
  label,
  value,
  align,
}: {
  color: string;
  label: string;
  value: string;
  align?: "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div
        className={`inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)] ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: color }}
        />
        {label}
      </div>
      <div className="mt-0.5 font-mono tabular-nums text-[15px] font-semibold text-[var(--ink)]">
        {value}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Allocation
// ──────────────────────────────────────────────────────────────────────

function AllocationCard({
  base,
  summary,
}: {
  base: string;
  summary: ReturnType<typeof summarize>;
}) {
  const slices = summary.byCategory.map((c) => ({
    label: c.category,
    amount: c.amount,
    color: catColor(c.category),
  }));
  const total = summary.assets;

  return (
    <div className="life-card p-5">
      <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-4 flex items-center gap-2">
        <span
          className="grid place-items-center w-6 h-6 rounded-[7px]"
          style={{ background: "var(--terra-tint)", color: "var(--terra)" }}
        >
          <Building2 size={12} />
        </span>
        Allocation
      </h2>

      {slices.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)] py-6 text-center">
          Add an asset to see how it&apos;s split.
        </p>
      ) : (
        <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
          <Donut
            slices={slices}
            center={
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                  Assets
                </div>
                <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--ink)] leading-tight">
                  {fmtMoney(total, base, { compact: true })}
                </div>
              </div>
            }
          />
          <ul className="flex-1 min-w-0 space-y-2 w-full">
            {slices.map((s) => {
              const pct = total > 0 ? (s.amount / total) * 100 : 0;
              return (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-[13px] text-[var(--ink-2)] font-medium truncate flex-1">
                    {s.label}
                  </span>
                  <span className="text-[12.5px] font-mono tabular-nums text-[var(--ink)]">
                    {fmtMoney(s.amount, base, { compact: true })}
                  </span>
                  <span className="text-[11px] tabular-nums text-[var(--muted-2)] w-9 text-right">
                    {Math.round(pct)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Accounts
// ──────────────────────────────────────────────────────────────────────

function AccountsCard({
  views,
  base,
  onEdit,
}: {
  views: AccountView[];
  base: string;
  onEdit: (item: StoredItem) => void;
}) {
  const assets = views.filter((v) => v.meta.accountType === "asset");
  const liabilities = views.filter((v) => v.meta.accountType === "liability");

  return (
    <div className="life-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--line)]">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px]"
            style={{ background: "var(--sage-tint)", color: "var(--sage)" }}
          >
            <Landmark size={12} />
          </span>
          Accounts
        </h2>
        <NewAccountButton />
      </div>

      {views.length === 0 ? (
        <p className="px-5 py-8 text-[13px] text-[var(--muted)] text-center">
          Add checking, savings, cash, property, or debts to build your net
          worth.
        </p>
      ) : (
        <div className="divide-y divide-[var(--line)]">
          {assets.length > 0 && (
            <AccountGroup
              title="Assets"
              views={assets}
              base={base}
              onEdit={onEdit}
            />
          )}
          {liabilities.length > 0 && (
            <AccountGroup
              title="Liabilities"
              views={liabilities}
              base={base}
              onEdit={onEdit}
              negative
            />
          )}
        </div>
      )}
    </div>
  );
}

function AccountGroup({
  title,
  views,
  base,
  onEdit,
  negative,
}: {
  title: string;
  views: AccountView[];
  base: string;
  onEdit: (item: StoredItem) => void;
  negative?: boolean;
}) {
  const subtotal = views.reduce((acc, v) => acc + (v.baseAmount ?? 0), 0);
  return (
    <div>
      <div className="px-5 py-2.5 flex items-center justify-between bg-[var(--paper-2)]">
        <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          {title}
        </span>
        <span
          className="text-[12px] font-mono tabular-nums font-semibold"
          style={{ color: negative ? "var(--bad)" : "var(--ink)" }}
        >
          {negative ? "−" : ""}
          {fmtMoney(subtotal, base, { compact: true })}
        </span>
      </div>
      <ul>
        {views.map((v) => (
          <AccountRow
            key={v.item.id}
            view={v}
            base={base}
            negative={negative}
            onEdit={() => onEdit(v.item)}
          />
        ))}
      </ul>
    </div>
  );
}

function AccountRow({
  view,
  base,
  negative,
  onEdit,
}: {
  view: AccountView;
  base: string;
  negative?: boolean;
  onEdit: () => void;
}) {
  const { item, meta, baseAmount } = view;
  const Icon = catIcon(meta.category);
  const color = catColor(meta.category);
  const showOriginal = meta.currency !== base;

  return (
    <li
      onClick={onEdit}
      className="group px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--paper-2)] transition cursor-pointer"
    >
      <span
        className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0"
        style={{
          background: `color-mix(in oklch, ${color} 14%, transparent)`,
          color,
          border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
        }}
      >
        <Icon size={17} strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-medium text-[var(--ink)] truncate">
            {item.title || "Untitled"}
          </span>
          <Pencil
            size={11}
            className="opacity-0 group-hover:opacity-100 text-[var(--muted-2)] transition shrink-0"
          />
        </div>
        <div className="text-[12px] text-[var(--muted)] truncate">
          {meta.category}
          {meta.institution ? ` · ${meta.institution}` : ""}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-mono tabular-nums text-[15px] font-semibold leading-none"
          style={{ color: negative ? "var(--bad)" : "var(--ink)" }}
        >
          {negative ? "−" : ""}
          {baseAmount != null
            ? fmtMoney(baseAmount, base)
            : fmtMoney(meta.balance, meta.currency)}
        </div>
        {showOriginal && baseAmount != null && (
          <div className="mt-1 text-[11px] text-[var(--muted-2)] font-mono tabular-nums">
            {fmtMoney(meta.balance, meta.currency)}
          </div>
        )}
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Holdings
// ──────────────────────────────────────────────────────────────────────

function HoldingsCard({
  views,
  base,
  totalBase,
  loading,
  refreshing,
  onRefresh,
  onEdit,
}: {
  views: HoldingView[];
  base: string;
  totalBase: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEdit: (item: StoredItem) => void;
}) {
  return (
    <div className="life-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-[var(--line)]">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px]"
            style={{ background: "var(--gold-tint)", color: "var(--gold)" }}
          >
            <Coins size={12} />
          </span>
          Holdings
        </h2>
        <div className="flex items-center gap-2">
          {views.length > 0 && (
            <span className="text-[13px] font-mono tabular-nums font-semibold text-[var(--ink)]">
              {fmtMoney(totalBase, base, { compact: true })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh prices"
            aria-label="Refresh prices"
            className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--terra)] transition"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
          <NewHoldingButton />
        </div>
      </div>

      {views.length === 0 ? (
        <p className="px-5 py-8 text-[13px] text-[var(--muted)] text-center">
          Track crypto or stock positions and Life OS values them live.
        </p>
      ) : (
        <>
          <div className="px-5 py-2.5 hidden sm:grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)] bg-[var(--paper-2)] border-b border-[var(--line)]">
            <span>Asset</span>
            <span className="text-right">Price</span>
            <span className="text-right">Value</span>
            <span className="text-right">P/L</span>
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {views.map((v) => (
              <HoldingRow
                key={v.item.id}
                view={v}
                base={base}
                loading={loading}
                onEdit={() => onEdit(v.item)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HoldingRow({
  view,
  base,
  loading,
  onEdit,
}: {
  view: HoldingView;
  base: string;
  loading: boolean;
  onEdit: () => void;
}) {
  const { item, meta, price, change, valueBase, pnlUsd, pnlPct } = view;
  const isCrypto = meta.assetClass === "crypto";
  const color = isCrypto ? "var(--gold)" : "var(--sky)";
  const up = (change ?? 0) >= 0;
  const pnlUp = (pnlUsd ?? 0) >= 0;

  return (
    <li
      onClick={onEdit}
      className="group px-5 py-3.5 grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 sm:gap-4 items-center hover:bg-[var(--paper-2)] transition cursor-pointer"
    >
      {/* Asset */}
      <div className="min-w-0 flex items-center gap-3">
        <span
          className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0 text-[12px] font-bold font-mono"
          style={{
            background: `color-mix(in oklch, ${color} 14%, transparent)`,
            color,
            border: `1px solid color-mix(in oklch, ${color} 28%, transparent)`,
          }}
        >
          {meta.symbol.slice(0, 4)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14.5px] font-medium text-[var(--ink)] truncate">
              {item.title || meta.symbol}
            </span>
            <Pencil
              size={11}
              className="opacity-0 group-hover:opacity-100 text-[var(--muted-2)] transition shrink-0"
            />
          </div>
          <div className="text-[12px] text-[var(--muted)] truncate font-mono tabular-nums">
            {fmtQty(meta.quantity)} {meta.symbol}
          </div>
        </div>
      </div>

      {/* Price (hidden on mobile) */}
      <div className="hidden sm:block text-right">
        {price == null ? (
          <span className="text-[12px] text-[var(--muted-2)]">
            {loading ? "…" : "—"}
          </span>
        ) : (
          <>
            <div className="font-mono tabular-nums text-[13.5px] text-[var(--ink)] leading-none">
              {fmtMoney(price, "USD")}
            </div>
            {change != null && (
              <div
                className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums"
                style={{ color: up ? "var(--sage)" : "var(--bad)" }}
              >
                {up ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                {fmtPct(change)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Value */}
      <div className="text-right">
        <div className="font-mono tabular-nums text-[15px] font-semibold text-[var(--ink)] leading-none">
          {valueBase != null
            ? fmtMoney(valueBase, base, { compact: true })
            : loading
              ? "…"
              : "—"}
        </div>
        {/* On mobile, show price under value */}
        {price != null && (
          <div className="mt-1 sm:hidden text-[11px] font-mono tabular-nums text-[var(--muted)]">
            {fmtMoney(price, "USD")}
            {change != null && (
              <span style={{ color: up ? "var(--sage)" : "var(--bad)" }}>
                {" "}
                {fmtPct(change)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* P/L (hidden on mobile) */}
      <div className="hidden sm:block text-right">
        {pnlUsd == null ? (
          <span className="text-[12px] text-[var(--muted-2)]">—</span>
        ) : (
          <>
            <div
              className="font-mono tabular-nums text-[13.5px] font-semibold leading-none"
              style={{ color: pnlUp ? "var(--sage)" : "var(--bad)" }}
            >
              {pnlUp ? "+" : "−"}
              {fmtMoney(Math.abs(pnlUsd), "USD", { compact: true })}
            </div>
            {pnlPct != null && (
              <div
                className="mt-1 text-[11px] font-mono tabular-nums"
                style={{ color: pnlUp ? "var(--sage)" : "var(--bad)" }}
              >
                {fmtPct(pnlPct)}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Recurring (from subscriptions)
// ──────────────────────────────────────────────────────────────────────

function RecurringCard({
  base,
  fx,
  subscriptions,
}: {
  base: string;
  fx: FxRates | null;
  subscriptions: StoredItem[];
}) {
  const active = subscriptions.filter((s) => s.status !== "archived");
  let monthlyBase = 0;
  let unconverted = 0;
  for (const s of active) {
    const sub = readSubscription(s);
    if (!sub) continue;
    const m = monthlyEquivalent(sub.amount, sub.cycle);
    const v = convert(m, sub.currency, base, fx);
    if (v == null) unconverted++;
    else monthlyBase += v;
  }

  const upcoming = active
    .map((item) => {
      const sub = readSubscription(item);
      return sub?.nextChargeAt
        ? { item, sub, t: new Date(sub.nextChargeAt).getTime() }
        : null;
    })
    .filter((x): x is { item: StoredItem; sub: NonNullable<ReturnType<typeof readSubscription>>; t: number } => x !== null)
    .filter((x) => x.t <= Date.now() + 30 * 86_400_000)
    .sort((a, b) => a.t - b.t)
    .slice(0, 4);

  return (
    <div className="life-card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px]"
            style={{ background: "var(--gold-tint)", color: "var(--gold)" }}
          >
            <CreditCard size={12} />
          </span>
          Recurring
        </h2>
        <Link
          href="/subscriptions"
          className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-[0.12em] font-medium text-[var(--muted-2)] hover:text-[var(--terra)] transition"
        >
          manage
          <ArrowRight size={10} />
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)] py-6 text-center flex-1">
          No subscriptions yet.{" "}
          <Link href="/subscriptions" className="text-[var(--terra)] hover:underline">
            Add one
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums tracking-[-0.02em] text-[34px] font-semibold text-[var(--ink)] leading-none">
              {fmtMoney(monthlyBase, base)}
            </span>
            <span className="text-[12.5px] text-[var(--muted)]">/ month</span>
          </div>
          <div className="mt-1 text-[12px] text-[var(--muted)] tabular-nums">
            ≈ {fmtMoney(monthlyBase * 12, base, { compact: true })} / year ·{" "}
            {active.length} active
            {unconverted > 0 ? ` · ${unconverted} other currency` : ""}
          </div>

          {upcoming.length > 0 && (
            <ul className="mt-4 pt-4 border-t border-[var(--line)] space-y-2">
              {upcoming.map(({ item, sub }) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2.5 text-[13px]"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--gold)" }}
                  />
                  <span className="text-[var(--ink-2)] truncate flex-1">
                    {item.title}
                  </span>
                  <span className="text-[11.5px] tabular-nums text-[var(--muted)] shrink-0">
                    {formatMoney(sub.amount, sub.currency)} ·{" "}
                    {nextChargeLabel(sub.nextChargeAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────

function EmptyHero() {
  return (
    <section className="life-card p-8 sm:p-10 relative overflow-hidden text-center">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "var(--terra)" }}
      />
      <div
        className="mx-auto mb-4 grid place-items-center w-[58px] h-[58px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Wallet size={24} strokeWidth={1.6} />
      </div>
      <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
        Your financial picture starts here.
      </h2>
      <p className="mt-2 text-[14px] text-[var(--muted)] max-w-md mx-auto leading-relaxed">
        Add the accounts you own and owe, and any crypto or stock you hold. Life
        OS sums it into a single net worth — converted to your base currency,
        valued live, charted over time. Nothing leaves your device.
      </p>
      <div className="mt-6 flex items-center justify-center gap-2.5">
        <NewAccountButton />
        <NewHoldingButton />
      </div>
    </section>
  );
}
