/**
 * Subscriptions are items of kind="subscription" with metadata:
 *   {
 *     amount: number,             // raw price per cycle
 *     currency: "USD" | "EUR" | ... (default "USD")
 *     cycle: "weekly" | "monthly" | "quarterly" | "yearly",
 *     nextChargeAt?: string       // ISO date — when the next charge hits
 *     category?: string           // user-defined ("AI", "Streaming", ...)
 *     cancelUrl?: string          // direct link to manage / cancel
 *   }
 *
 * All amounts are stored as the user entered them — no conversion. When we
 * sum, we sum per-currency, so a $50/mo + €5/mo profile renders as two lines.
 */
import type { StoredItem } from "@/lib/store/db";

export type Cycle = "weekly" | "monthly" | "quarterly" | "yearly";

export type SubscriptionMeta = {
  amount: number;
  currency: string;
  cycle: Cycle;
  nextChargeAt?: string;
  category?: string;
  cancelUrl?: string;
  website?: string;
  paused?: boolean;
};

/** Extract a clean hostname for favicon lookups. */
export function domainOf(url?: string): string | null {
  if (!url || !url.trim()) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** A favicon URL for a domain (DuckDuckGo — privacy-friendly, decent quality). */
export function faviconUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export const CYCLES: Cycle[] = ["weekly", "monthly", "quarterly", "yearly"];

export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "ILS",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
] as const;

const SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  ILS: "₪",
  JPY: "¥",
  CHF: "CHF ",
  CAD: "C$",
  AUD: "A$",
};

export function currencySymbol(code: string): string {
  return SYMBOL[code] ?? `${code} `;
}

export function formatMoney(amount: number, currency: string): string {
  // Avoid locale weirdness — just symbol + 0/2-decimal number.
  const fixed = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
  return `${currencySymbol(currency)}${fixed}`;
}

/** Convert a subscription's price to its monthly equivalent. */
export function monthlyEquivalent(amount: number, cycle: Cycle): number {
  switch (cycle) {
    case "weekly":
      return (amount * 52) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
  }
}

export function readSubscription(item: StoredItem): SubscriptionMeta | null {
  const m = (item.metadata ?? {}) as Partial<SubscriptionMeta>;
  if (typeof m.amount !== "number" || !m.currency || !m.cycle) return null;
  return {
    amount: m.amount,
    currency: m.currency,
    cycle: m.cycle,
    nextChargeAt: m.nextChargeAt,
    category: m.category,
    cancelUrl: m.cancelUrl,
    website: m.website,
    paused: m.paused === true,
  };
}

/** Total monthly spend, grouped by currency. */
export function monthlyTotals(items: StoredItem[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    if (item.status === "archived") continue;
    const sub = readSubscription(item);
    if (!sub || sub.paused) continue;
    const monthly = monthlyEquivalent(sub.amount, sub.cycle);
    totals[sub.currency] = (totals[sub.currency] ?? 0) + monthly;
  }
  return totals;
}

/** "in 5 days", "today", "yesterday", "in 3 weeks". */
export function nextChargeLabel(dateIso: string | undefined): string | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) {
    if (days === -1) return "overdue";
    return `${-days}d overdue`;
  }
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days}d`;
  if (days < 30) return `in ${Math.round(days / 7)}w`;
  if (days < 365) return `in ${Math.round(days / 30)}mo`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
