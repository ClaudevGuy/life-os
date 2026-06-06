"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import Link from "next/link";
import { Portal } from "@/components/portal";
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
  ChevronDown,
  Check,
  Plus,
  X,
  Copy,
  ExternalLink,
  Trash2,
  TriangleAlert,
  Loader2,
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
import { UsdCard } from "./usd-card";
import { ymd } from "@/lib/ymd";
import { Donut, Sparkline } from "./charts";
import { NewAccountButton, AccountModal } from "./account-modal";
import { NewHoldingButton, HoldingModal } from "./holding-modal";
import {
  useWallets,
  useWalletBalances,
  addWallet,
  removeWallet,
  type TrackedWallet,
  type WalletState,
} from "@/lib/store/wallets";
import {
  isValidSolanaAddress,
  truncateAddress,
  type WalletAsset,
} from "@/lib/solana";
import { toast } from "sonner";

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
  crypto: Record<string, { price: number; change: number; image?: string | null }>;
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
  image: string | null;
  valueUsd: number | null;
  valueBase: number | null;
  pnlUsd: number | null;
  pnlPct: number | null;
};

/** Portfolio-level aggregates across all holdings, in base currency. */
type HoldingsRollup = {
  marketValue: number | null;
  costBasis: number | null;
  unrealized: number | null;
  unrealizedPct: number | null;
  todayMove: number | null;
  todayPct: number | null;
  costCount: number;
  total: number;
};

const BASE_KEY = "lifeos.finance.base";

export default function FinancePage() {
  const accounts = (useItemsOfKind("account") ?? []) as StoredItem[];
  const holdings = (useItemsOfKind("holding") ?? []) as StoredItem[];
  const subscriptions = (useItemsOfKind("subscription") ?? []) as StoredItem[];
  const snapshots = useSnapshots() ?? [];
  const wallets = useWallets() ?? [];

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
        const image =
          meta.assetClass === "crypto" && meta.coinId
            ? quotes?.crypto[meta.coinId]?.image ?? null
            : null;
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
          image,
          valueUsd,
          valueBase,
          pnlUsd,
          pnlPct,
        };
      })
      .filter((x): x is HoldingView => x !== null);
  }, [holdings, quotes, base, fx]);

  // Live, priced balances for each tracked on-chain wallet.
  const walletStates = useWalletBalances(wallets, quoteNonce);

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
    // Tracked wallets count as crypto assets at their live total (USD).
    for (const w of wallets) {
      const d = walletStates[w.id]?.data;
      if (d && d.totalUsd > 0) {
        out.push({
          id: `wallet:${w.id}`,
          bucket: "asset",
          category: "Crypto",
          amount: d.totalUsd,
          currency: "USD",
        });
      }
    }
    return out;
  }, [accountViews, holdingViews, wallets, walletStates]);

  const summary = useMemo(() => summarize(lines, base, fx), [lines, base, fx]);

  const hasData =
    accounts.length > 0 || holdings.length > 0 || wallets.length > 0;
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

  // Portfolio roll-up: market value, cost basis, unrealized gain and the true
  // 24h move — all summed in the base currency from the same live quotes the
  // rows use. Unrealized/Today each cover only the positions that carry the
  // needed inputs (a cost basis / a 24h change), so the math stays honest.
  const holdingsRollup = useMemo<HoldingsRollup>(() => {
    let marketValue = 0;
    let hasValue = false;
    let costBasis = 0;
    let costMarket = 0; // market value of the cost-basis'd subset
    let costCount = 0;
    let curr = 0;
    let prev = 0; // yesterday's value of the 24h-moving subset
    for (const h of holdingViews) {
      if (h.valueBase != null) {
        marketValue += h.valueBase;
        hasValue = true;
      }
      if (h.valueBase != null && h.meta.costBasis != null) {
        const cbBase = convert(h.meta.costBasis, h.meta.currency, base, fx);
        if (cbBase != null) {
          costBasis += cbBase;
          costMarket += h.valueBase;
          costCount++;
        }
      }
      if (h.valueBase != null && h.change != null) {
        curr += h.valueBase;
        prev += h.valueBase / (1 + h.change / 100);
      }
    }
    return {
      marketValue: hasValue ? marketValue : null,
      costBasis: costCount > 0 ? costBasis : null,
      unrealized: costCount > 0 ? costMarket - costBasis : null,
      unrealizedPct:
        costCount > 0 && costBasis > 0
          ? ((costMarket - costBasis) / costBasis) * 100
          : null,
      todayMove: prev > 0 ? curr - prev : null,
      todayPct: prev > 0 ? ((curr - prev) / prev) * 100 : null,
      costCount,
      total: holdingViews.length,
    };
  }, [holdingViews, base, fx]);

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
          <ConnectWalletButton variant="header" />
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
            rollup={holdingsRollup}
            loading={quotesLoading}
            refreshing={quotesRefreshing}
            onRefresh={refreshQuotes}
            onEdit={setEditingHolding}
          />

          <WalletsCard
            wallets={wallets}
            states={walletStates}
            base={base}
            fx={fx}
            refreshing={quotesRefreshing}
            onRefresh={refreshQuotes}
          />
        </>
      )}

      {/* US Dollar (DXY) */}
      <UsdCard />

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
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    right: number;
    minWidth: number;
  } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const r = ref.current?.getBoundingClientRect();
    if (r)
      setPos({
        top: r.bottom + 6,
        right: window.innerWidth - r.right,
        minWidth: r.width,
      });
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-full bg-[var(--paper)] border pl-3 pr-2.5 py-1.5 transition ${
          open
            ? "border-[var(--terra)]"
            : "border-[var(--line-2)] hover:border-[var(--terra)]"
        }`}
      >
        <span className="uppercase tracking-[0.12em] text-[10.5px] font-semibold text-[var(--muted)]">
          Base
        </span>
        <span className="text-[13px] font-semibold text-[var(--ink)] tabular-nums">
          {base}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-[var(--muted-2)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && pos && (
        <Portal>
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setOpen(false)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              role="listbox"
              className="absolute rounded-[12px] border border-[var(--line-2)] bg-[var(--paper)] p-1.5 life-rise max-h-[300px] overflow-y-auto"
              style={{
                top: pos.top,
                right: pos.right,
                minWidth: Math.max(pos.minWidth, 138),
                boxShadow: "var(--shadow-3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {CURRENCIES.map((c) => {
                const active = c === base;
                return (
                  <button
                    key={c}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(c);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[13.5px] font-medium transition ${
                      active
                        ? "text-[var(--terra)]"
                        : "text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
                    }`}
                    style={active ? { background: "var(--terra-tint)" } : undefined}
                  >
                    <span
                      className="grid place-items-center w-6 h-6 rounded-[7px] text-[12px] font-semibold shrink-0"
                      style={{
                        background: active
                          ? "color-mix(in oklch, var(--terra) 18%, transparent)"
                          : "var(--bg-2)",
                        color: active ? "var(--terra)" : "var(--muted)",
                      }}
                    >
                      {currencySymbol(c)}
                    </span>
                    <span className="flex-1 text-left tabular-nums">{c}</span>
                    {active && <Check size={14} strokeWidth={2.4} />}
                  </button>
                );
              })}
            </div>
          </div>
        </Portal>
      )}
    </>
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

/** "+$1.2K" / "−$840" / "—" — a signed, compact money figure for roll-up stats. */
function signedMoney(n: number | null, base: string): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${fmtMoney(Math.abs(n), base, { compact: true })}`;
}

function toneOf(n: number | null): "up" | "down" | undefined {
  if (n == null) return undefined;
  return n >= 0 ? "up" : "down";
}

function RollStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  const color =
    tone === "up"
      ? "var(--sage)"
      : tone === "down"
        ? "var(--bad)"
        : "var(--ink)";
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)]">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
        <span
          className="text-[15px] font-mono tabular-nums font-semibold leading-none"
          style={{ color }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="text-[11.5px] font-semibold tabular-nums leading-none"
            style={{ color }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function HoldingsCard({
  views,
  base,
  rollup,
  loading,
  refreshing,
  onRefresh,
  onEdit,
}: {
  views: HoldingView[];
  base: string;
  rollup: HoldingsRollup;
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

      {/* Portfolio roll-up */}
      {views.length > 0 && (
        <div className="border-b border-[var(--line)]">
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3.5">
            <RollStat
              label="Value"
              value={
                rollup.marketValue != null
                  ? fmtMoney(rollup.marketValue, base, { compact: true })
                  : "—"
              }
            />
            <RollStat
              label="Cost basis"
              value={
                rollup.costBasis != null
                  ? fmtMoney(rollup.costBasis, base, { compact: true })
                  : "—"
              }
            />
            <RollStat
              label="Unrealized"
              value={signedMoney(rollup.unrealized, base)}
              sub={
                rollup.unrealizedPct != null
                  ? fmtPct(rollup.unrealizedPct)
                  : undefined
              }
              tone={toneOf(rollup.unrealized)}
            />
            <RollStat
              label="Today"
              value={signedMoney(rollup.todayMove, base)}
              sub={rollup.todayPct != null ? fmtPct(rollup.todayPct) : undefined}
              tone={toneOf(rollup.todayMove)}
            />
          </div>
          {rollup.costCount > 0 && rollup.costCount < rollup.total && (
            <p className="px-5 pb-3 text-[10.5px] text-[var(--muted-2)] leading-snug">
              Unrealized P/L covers the {rollup.costCount} of {rollup.total}{" "}
              position{rollup.total === 1 ? "" : "s"} with a recorded cost basis.
            </p>
          )}
        </div>
      )}

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
  const { item, meta, price, change, image, valueBase, pnlUsd, pnlPct } = view;
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
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            className="w-10 h-10 rounded-full shrink-0 bg-[var(--bg-2)]"
          />
        ) : (
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
        )}
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

// ──────────────────────────────────────────────────────────────────────
// Wallets — watch-only on-chain tracking (Solana)
// ──────────────────────────────────────────────────────────────────────

type PhantomProvider = {
  isPhantom?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: { toString(): string };
  }>;
};

function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const p = w.phantom?.solana ?? w.solana;
  return p?.isPhantom ? p : null;
}

/** Solana gradient chip — avatar fallback for wallets and SOL. */
function SolMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center rounded-[8px] shrink-0 font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
      }}
    >
      ◎
    </span>
  );
}

function ConnectWalletButton({
  variant = "header",
}: {
  variant?: "header" | "primary";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "life-btn life-btn-sm life-btn-primary"
            : "life-btn life-btn-sm"
        }
      >
        <Plus size={13} strokeWidth={2} />
        Connect wallet
      </button>
      {open && <ConnectWalletModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ConnectWalletModal({ onClose }: { onClose: () => void }) {
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const phantom = getPhantom();

  async function connectPhantom() {
    const p = getPhantom();
    if (!p) {
      setErr(
        "Phantom isn't detected here. Paste an address below, or install it from phantom.app.",
      );
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const resp = await p.connect();
      const addr = resp.publicKey.toString();
      const w = await addWallet({
        chain: "solana",
        address: addr,
        label: "Phantom",
      });
      if (!w) {
        setErr("That wallet is already tracked.");
        setBusy(false);
        return;
      }
      toast.success("Wallet connected");
      onClose();
    } catch {
      setErr("Connection canceled.");
      setBusy(false);
    }
  }

  async function trackPasted() {
    const a = address.trim();
    if (!isValidSolanaAddress(a)) {
      setErr("That doesn't look like a Solana address.");
      return;
    }
    setBusy(true);
    setErr(null);
    const w = await addWallet({ chain: "solana", address: a });
    if (!w) {
      setErr("That wallet is already tracked.");
      setBusy(false);
      return;
    }
    toast.success("Wallet added");
    onClose();
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 pb-4 flex items-start gap-3 border-b border-[var(--line)]">
            <SolMark size={36} />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                Track a wallet
              </div>
              <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
                Solana
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
            >
              <X size={14} strokeWidth={1.6} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <button
              type="button"
              onClick={connectPhantom}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              style={{ background: "#ab9ff2" }}
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <span className="text-[15px] leading-none">👻</span>
              )}
              Connect Phantom
            </button>

            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-[var(--line)]" />
              <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)]">
                or paste an address
              </span>
              <span className="flex-1 h-px bg-[var(--line)]" />
            </div>

            <div className="space-y-2">
              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") trackPasted();
                }}
                placeholder="Solana address (7xKX…9aQp)"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
              <button
                type="button"
                onClick={trackPasted}
                disabled={busy || !address.trim()}
                className="life-btn life-btn-sm life-btn-primary w-full justify-center disabled:opacity-50"
              >
                Track address
              </button>
            </div>

            {err && (
              <p className="text-[12px] text-[var(--bad)] flex items-start gap-1.5">
                <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                <span>{err}</span>
              </p>
            )}

            <p className="text-[11px] text-[var(--muted-2)] leading-relaxed border-t border-[var(--line)] pt-3">
              Watch-only — Life OS reads balances from the public chain and never
              asks you to sign anything. Remove a wallet anytime.
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function WalletsCard({
  wallets,
  states,
  base,
  fx,
  refreshing,
  onRefresh,
}: {
  wallets: TrackedWallet[];
  states: Record<string, WalletState>;
  base: string;
  fx: FxRates | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const totalUsd = wallets.reduce(
    (s, w) => s + (states[w.id]?.data?.totalUsd ?? 0),
    0,
  );
  const totalBase = convert(totalUsd, "USD", base, fx);

  return (
    <div className="life-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-[var(--line)]">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] flex items-center gap-2">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px]"
            style={{
              background: "color-mix(in oklch, #9945FF 18%, transparent)",
              color: "#9945FF",
            }}
          >
            <Wallet size={12} />
          </span>
          Wallets
        </h2>
        <div className="flex items-center gap-2">
          {wallets.length > 0 && totalBase != null && totalUsd > 0 && (
            <span className="text-[13px] font-mono tabular-nums font-semibold text-[var(--ink)]">
              {fmtMoney(totalBase, base, { compact: true })}
            </span>
          )}
          {wallets.length > 0 && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh balances"
              aria-label="Refresh balances"
              className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--terra)] transition"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
          <ConnectWalletButton variant="header" />
        </div>
      </div>

      {wallets.length === 0 ? (
        <div className="px-5 py-9 flex flex-col items-center text-center">
          <SolMark size={36} />
          <p className="mt-3 text-[14px] font-medium text-[var(--ink)]">
            Track an on-chain wallet
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--muted)] max-w-xs leading-relaxed">
            Connect Phantom or paste a Solana address — Life OS reads its live
            balances and folds them into your net worth.
          </p>
          <div className="mt-4">
            <ConnectWalletButton variant="primary" />
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {wallets.map((w) => (
            <WalletRow
              key={w.id}
              wallet={w}
              state={states[w.id]}
              base={base}
              fx={fx}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function WalletRow({
  wallet,
  state,
  base,
  fx,
}: {
  wallet: TrackedWallet;
  state: WalletState | undefined;
  base: string;
  fx: FxRates | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const data = state?.data ?? null;
  const loading = state?.loading ?? true;
  const error = state?.error ?? null;
  const totalBase = data ? convert(data.totalUsd, "USD", base, fx) : null;
  const label = wallet.label || truncateAddress(wallet.address);

  const assets = data?.assets ?? [];
  const shown = assets.slice(0, 6);
  const moreCount = Math.max(0, assets.length - shown.length);

  function copy() {
    navigator.clipboard?.writeText(wallet.address);
    toast.success("Address copied");
  }
  function remove() {
    if (!confirm("Stop tracking this wallet?")) return;
    removeWallet(wallet.id);
    toast.success("Wallet removed");
  }

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <SolMark size={34} />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 min-w-0 text-left group"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[14.5px] font-medium text-[var(--ink)] truncate">
              {label}
            </span>
            <ChevronDown
              size={13}
              className={`text-[var(--muted-2)] transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
          <div className="text-[12px] text-[var(--muted)] font-mono truncate">
            {truncateAddress(wallet.address, 6, 6)}
          </div>
        </button>

        <div className="text-right shrink-0 min-w-[64px]">
          {loading && !data ? (
            <span className="text-[12px] text-[var(--muted-2)] inline-flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Reading…
            </span>
          ) : totalBase != null ? (
            <div className="text-[15px] font-mono tabular-nums font-semibold text-[var(--ink)]">
              {fmtMoney(totalBase, base, { compact: true })}
            </div>
          ) : (
            <span className="text-[12px] text-[var(--muted-2)]">—</span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <a
            href={`https://solscan.io/account/${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Solscan"
            className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--terra)] transition"
          >
            <ExternalLink size={13} />
          </a>
          <button
            type="button"
            onClick={copy}
            title="Copy address"
            className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--ink)] transition"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={remove}
            title="Remove wallet"
            className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--bad)] transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {error && !data && (
        <p className="mt-2 ml-[46px] text-[11.5px] text-[var(--muted)] flex items-start gap-1.5">
          <TriangleAlert size={12} className="mt-0.5 text-[var(--gold)] shrink-0" />
          <span>
            {error === "invalid_address"
              ? "That address looks invalid."
              : "Couldn't reach the chain — the public RPC may be rate-limited. Try refresh, or set a custom SOLANA_RPC_URL."}
          </span>
        </p>
      )}

      {expanded && data && assets.length > 0 && (
        <ul className="mt-3 ml-[46px] space-y-1.5">
          {shown.map((a) => (
            <WalletAssetRow key={a.mint} asset={a} base={base} fx={fx} />
          ))}
          {(moreCount > 0 || data.hiddenCount > 0) && (
            <li className="text-[11px] text-[var(--muted-2)] pt-0.5">
              {moreCount > 0 && `+${moreCount} more`}
              {moreCount > 0 && data.hiddenCount > 0 && " · "}
              {data.hiddenCount > 0 &&
                `${data.hiddenCount} unpriced token${
                  data.hiddenCount === 1 ? "" : "s"
                }`}
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function WalletAssetRow({
  asset,
  base,
  fx,
}: {
  asset: WalletAsset;
  base: string;
  fx: FxRates | null;
}) {
  const valueBase =
    asset.valueUsd != null ? convert(asset.valueUsd, "USD", base, fx) : null;
  return (
    <li className="flex items-center gap-2.5">
      {asset.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.logo}
          alt=""
          loading="lazy"
          className="w-6 h-6 rounded-full bg-[var(--bg-2)] shrink-0"
        />
      ) : asset.symbol === "SOL" ? (
        <SolMark size={24} />
      ) : (
        <span className="grid place-items-center w-6 h-6 rounded-[6px] shrink-0 text-[9px] font-bold font-mono bg-[var(--bg-2)] text-[var(--muted)]">
          {(asset.symbol || "?").replace("…", "").slice(0, 3)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-medium text-[var(--ink)]">
          {asset.symbol || "Unknown"}
        </span>
        <span className="text-[11.5px] text-[var(--muted)] font-mono ml-1.5">
          {fmtQty(asset.amount)}
        </span>
      </div>
      <span className="text-[13px] font-mono tabular-nums text-[var(--ink-2)] shrink-0">
        {valueBase != null ? fmtMoney(valueBase, base, { compact: true }) : "—"}
      </span>
    </li>
  );
}
