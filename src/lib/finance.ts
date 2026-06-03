/**
 * Finance domain model.
 *
 * Two new item kinds power the Finance page:
 *
 *  • kind="account"  — a balance you maintain by hand. metadata:
 *      { accountType: "asset"|"liability", category, balance, currency, institution? }
 *
 *  • kind="holding"  — a market position valued live. metadata:
 *      { assetClass: "crypto"|"stock", symbol, coinId?, quantity, costBasis?, currency }
 *
 * Money is never converted at rest — each row keeps its own currency. The page
 * converts to a single base currency (via /api/markets/fx) only when summing.
 */
import type { StoredItem } from "@/lib/store/db";
import { currencySymbol } from "@/lib/subscriptions";

export { CURRENCIES, currencySymbol } from "@/lib/subscriptions";

// ── Accounts ──────────────────────────────────────────────────────────────────

export type AccountType = "asset" | "liability";

export type AccountMeta = {
  accountType: AccountType;
  category: string;
  balance: number;
  currency: string;
  institution?: string;
};

export const ASSET_CATEGORIES = [
  "Cash",
  "Checking",
  "Savings",
  "Investments",
  "Retirement",
  "Crypto",
  "Real estate",
  "Vehicle",
  "Other asset",
] as const;

export const LIABILITY_CATEGORIES = [
  "Credit card",
  "Loan",
  "Mortgage",
  "Other debt",
] as const;

export function readAccount(item: StoredItem): AccountMeta | null {
  const m = (item.metadata ?? {}) as Partial<AccountMeta>;
  if (typeof m.balance !== "number" || !m.currency || !m.accountType) return null;
  return {
    accountType: m.accountType,
    category: m.category || (m.accountType === "asset" ? "Cash" : "Other debt"),
    balance: m.balance,
    currency: m.currency,
    institution: m.institution,
  };
}

// ── Holdings ────────────────────────────────────────────────────────────────

export type AssetClass = "crypto" | "stock";

export type HoldingMeta = {
  assetClass: AssetClass;
  symbol: string;
  coinId?: string;
  quantity: number;
  costBasis?: number; // total cost in `currency`
  currency: string; // pricing currency (USD)
};

export function readHolding(item: StoredItem): HoldingMeta | null {
  const m = (item.metadata ?? {}) as Partial<HoldingMeta>;
  if (!m.assetClass || !m.symbol || typeof m.quantity !== "number") return null;
  return {
    assetClass: m.assetClass,
    symbol: m.symbol,
    coinId: m.coinId,
    quantity: m.quantity,
    costBasis: typeof m.costBasis === "number" ? m.costBasis : undefined,
    currency: m.currency || "USD",
  };
}

/** Curated coin list so a holding always carries a CoinGecko id for pricing. */
export const COIN_CATALOG: { id: string; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "tron", symbol: "TRX", name: "TRON" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "matic-network", symbol: "MATIC", name: "Polygon" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap" },
  { id: "polygon-ecosystem-token", symbol: "POL", name: "Polygon (POL)" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos" },
  { id: "stellar", symbol: "XLM", name: "Stellar" },
  { id: "monero", symbol: "XMR", name: "Monero" },
  { id: "aave", symbol: "AAVE", name: "Aave" },
  { id: "render-token", symbol: "RENDER", name: "Render" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol" },
];

/** Popular tickers for the picker; the stock field also accepts free entry. */
export const STOCK_CATALOG: { symbol: string; name: string }[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "NVDA", name: "Nvidia" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "BRK-B", name: "Berkshire Hathaway" },
  { symbol: "AVGO", name: "Broadcom" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa" },
  { symbol: "MA", name: "Mastercard" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "COST", name: "Costco" },
  { symbol: "PLTR", name: "Palantir" },
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "VOO", name: "Vanguard S&P 500" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "VTI", name: "Vanguard Total Market" },
];

// ── Currency conversion ───────────────────────────────────────────────────────

export type FxRates = {
  base: string;
  date: string | null;
  rates: Record<string, number>; // units of currency per 1 base
};

/**
 * Convert `amount` from one currency to another using rates expressed in
 * `fx.base`. Returns null when a needed rate is missing (caller decides how to
 * surface the un-converted amount). Same-currency conversions never need fx.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  fx: FxRates | null,
): number | null {
  if (from === to) return amount;
  if (!fx) return null;
  const rFrom = from === fx.base ? 1 : fx.rates[from];
  const rTo = to === fx.base ? 1 : fx.rates[to];
  if (!rFrom || !rTo) return null;
  return (amount / rFrom) * rTo;
}

// ── Net-worth summary ─────────────────────────────────────────────────────────

export type FinLine = {
  id: string;
  bucket: AccountType;
  category: string;
  amount: number;
  currency: string;
};

export type FinSummary = {
  assets: number;
  liabilities: number;
  net: number;
  /** Asset totals by category, in base currency (for allocation). */
  byCategory: { category: string; amount: number }[];
  /** Count of lines we couldn't convert (missing FX rate). */
  unconverted: number;
};

export function summarize(
  lines: FinLine[],
  base: string,
  fx: FxRates | null,
): FinSummary {
  let assets = 0;
  let liabilities = 0;
  let unconverted = 0;
  const cats = new Map<string, number>();

  for (const l of lines) {
    const v = convert(l.amount, l.currency, base, fx);
    if (v == null) {
      unconverted++;
      continue;
    }
    if (l.bucket === "asset") {
      assets += v;
      cats.set(l.category, (cats.get(l.category) ?? 0) + v);
    } else {
      liabilities += v;
    }
  }

  const byCategory = [...cats.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { assets, liabilities, net: assets - liabilities, byCategory, unconverted };
}

// ── Formatting ────────────────────────────────────────────────────────────────

/** Grouped currency, e.g. "$1,234,567" or "$1.2M" when compact. */
export function fmtMoney(
  amount: number,
  currency = "USD",
  opts?: { compact?: boolean; decimals?: number },
): string {
  if (!isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: opts?.compact && abs >= 100_000 ? "compact" : "standard",
      maximumFractionDigits:
        opts?.decimals ?? (abs >= 1000 ? 0 : abs >= 1 ? 2 : 4),
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    const fixed = abs >= 1000 ? Math.round(amount).toString() : amount.toFixed(2);
    return `${currencySymbol(currency)}${fixed}`;
  }
}

/** A signed percent like "+2.3%" / "−4.1%". */
export function fmtPct(pct: number, decimals = 1): string {
  if (!isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(decimals)}%`;
}

/** Compact quantity for holdings (avoids long float tails). */
export function fmtQty(n: number): string {
  if (!isFinite(n)) return "0";
  if (Number.isInteger(n)) return n.toLocaleString();
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}
