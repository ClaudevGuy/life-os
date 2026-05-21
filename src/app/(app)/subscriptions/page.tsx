"use client";

import { useMemo, useState } from "react";
import { useItemsOfKind } from "@/lib/store/items";
import type { StoredItem } from "@/lib/store/items";
import {
  CreditCard,
  ExternalLink,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { NewSubscriptionButton, SubscriptionModal } from "./new-subscription";
import {
  formatMoney,
  monthlyEquivalent,
  monthlyTotals,
  nextChargeLabel,
  readSubscription,
  currencySymbol,
} from "@/lib/subscriptions";

const STUDIO_PALETTE = [
  "var(--terra)",
  "var(--gold)",
  "var(--sage)",
  "var(--plum)",
  "var(--sky)",
];
const STUDIO_TINTS: Record<string, string> = {
  "var(--terra)": "var(--terra-tint)",
  "var(--gold)": "var(--gold-tint)",
  "var(--sage)": "var(--sage-tint)",
  "var(--plum)": "var(--plum-tint)",
  "var(--sky)": "var(--sky-tint)",
};

function colorForCategory(category: string | undefined, fallbackSeed: string): string {
  const seed = category?.trim() || fallbackSeed;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return STUDIO_PALETTE[Math.abs(hash) % STUDIO_PALETTE.length];
}

function initial(name: string | null): string {
  return name?.trim()?.[0]?.toUpperCase() ?? "·";
}

type SubRow = {
  item: StoredItem;
  sub: NonNullable<ReturnType<typeof readSubscription>>;
  monthly: number;
  color: string;
  tint: string;
};

export default function SubscriptionsPage() {
  const rows = (useItemsOfKind("subscription") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);

  const data = useMemo<SubRow[]>(() => {
    const active = rows.filter((r) => r.status !== "archived");
    return active
      .map((item) => {
        const sub = readSubscription(item);
        if (!sub) return null;
        const color = colorForCategory(sub.category, item.id);
        return {
          item,
          sub,
          monthly: monthlyEquivalent(sub.amount, sub.cycle),
          color,
          tint: STUDIO_TINTS[color] ?? "var(--paper-2)",
        };
      })
      .filter((x): x is SubRow => x !== null);
  }, [rows]);

  const totals = useMemo(
    () => monthlyTotals(data.map((d) => d.item)),
    [data],
  );
  const primaryCurrency =
    Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  const primaryMonthly = totals[primaryCurrency] ?? 0;

  // Sort: soonest renewal → highest monthly cost.
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const ta = a.sub.nextChargeAt
        ? new Date(a.sub.nextChargeAt).getTime()
        : Infinity;
      const tb = b.sub.nextChargeAt
        ? new Date(b.sub.nextChargeAt).getTime()
        : Infinity;
      if (ta !== tb) return ta - tb;
      return b.monthly - a.monthly;
    });
  }, [data]);

  const biggest = useMemo(
    () =>
      [...data]
        .filter((d) => d.sub.currency === primaryCurrency)
        .sort((a, b) => b.monthly - a.monthly)[0] ?? null,
    [data, primaryCurrency],
  );

  // Category breakdown — only for the primary currency so the bar is honest.
  const categoryShares = useMemo(() => {
    const totalsByCat = new Map<string, { monthly: number; color: string }>();
    let denom = 0;
    for (const d of data) {
      if (d.sub.currency !== primaryCurrency) continue;
      denom += d.monthly;
      const label = d.sub.category?.trim() || "Uncategorized";
      const existing = totalsByCat.get(label);
      if (existing) existing.monthly += d.monthly;
      else totalsByCat.set(label, { monthly: d.monthly, color: d.color });
    }
    if (denom === 0) return [];
    return [...totalsByCat.entries()]
      .map(([label, v]) => ({
        label,
        monthly: v.monthly,
        color: v.color,
        pct: (v.monthly / denom) * 100,
      }))
      .sort((a, b) => b.monthly - a.monthly);
  }, [data, primaryCurrency]);

  const renewingSoon = useMemo(() => {
    const cutoff = Date.now() + 7 * 86_400_000;
    return data.filter(
      (d) =>
        d.sub.nextChargeAt &&
        new Date(d.sub.nextChargeAt).getTime() <= cutoff,
    ).length;
  }, [data]);

  return (
    <div className="p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <CreditCard
              size={20}
              strokeWidth={1.6}
              className="text-[var(--terra)]"
            />
            Subscriptions
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Recurring charges, what they cost, and when they renew.
          </p>
        </div>
        <NewSubscriptionButton />
      </header>

      {data.length === 0 ? (
        <EmptyHero />
      ) : (
        <>
          {/* Hero — total + secondary currencies + renewing-soon + biggest */}
          <section className="life-card p-6 mb-6 relative overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: "var(--terra)" }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr] gap-6 items-start">
              {/* Big total */}
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                  Monthly · {primaryCurrency}
                </div>
                <div className="mt-1 flex items-baseline gap-3">
                  <div
                    className="font-mono tabular-nums tracking-[-0.03em] leading-none"
                    style={{
                      color: "var(--terra)",
                      fontSize: 64,
                      fontWeight: 600,
                    }}
                  >
                    {currencySymbol(primaryCurrency)}
                    {primaryMonthly < 100
                      ? primaryMonthly.toFixed(2)
                      : Math.round(primaryMonthly)}
                  </div>
                  <div className="text-[13px] text-[var(--muted)] tabular-nums">
                    ≈ {formatMoney(Math.round(primaryMonthly * 12), primaryCurrency)} / year
                  </div>
                </div>

                {/* Other currencies, if any */}
                {Object.entries(totals).filter(([c]) => c !== primaryCurrency).length >
                  0 && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
                    {Object.entries(totals)
                      .filter(([c]) => c !== primaryCurrency)
                      .map(([currency, monthly]) => (
                        <span key={currency} className="tabular-nums text-[var(--muted)]">
                          <span className="font-semibold text-[var(--ink)]">
                            {formatMoney(Math.round(monthly), currency)}
                          </span>{" "}
                          / mo
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Right column: side stats */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:pl-4 sm:border-l sm:border-[var(--line)]">
                <SideStat label="Subscriptions" value={data.length} />
                <SideStat
                  label="Renewing 7d"
                  value={renewingSoon}
                  color={renewingSoon > 0 ? "var(--gold)" : "var(--ink)"}
                />
                {biggest && (
                  <div className="col-span-2">
                    <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] flex items-center gap-1.5">
                      <TrendingUp size={11} strokeWidth={1.6} />
                      Biggest line
                    </div>
                    <div className="mt-1 flex items-center gap-2.5">
                      <span
                        className="grid place-items-center w-8 h-8 rounded-[9px] text-[13px] font-semibold tracking-[-0.01em] shrink-0"
                        style={{
                          background: biggest.tint,
                          color: biggest.color,
                          border: `1px solid color-mix(in oklch, ${biggest.color} 30%, transparent)`,
                        }}
                      >
                        {initial(biggest.item.title)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-[var(--ink)] truncate">
                          {biggest.item.title || "Untitled"}
                        </div>
                        <div className="text-[11.5px] text-[var(--muted)] tabular-nums">
                          {formatMoney(
                            Math.round(biggest.monthly),
                            biggest.sub.currency,
                          )}
                          /mo ·{" "}
                          {Math.round((biggest.monthly / primaryMonthly) * 100)}% of
                          total
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Category breakdown bar */}
            {categoryShares.length > 1 && (
              <div className="mt-6 pt-5 border-t border-[var(--line)]">
                <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
                  Where it goes
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg-2)]">
                  {categoryShares.map((c) => (
                    <div
                      key={c.label}
                      title={`${c.label} · ${formatMoney(
                        Math.round(c.monthly),
                        primaryCurrency,
                      )}/mo`}
                      style={{
                        width: `${c.pct}%`,
                        background: c.color,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
                  {categoryShares.map((c) => (
                    <span
                      key={c.label}
                      className="inline-flex items-center gap-1.5 text-[var(--muted)]"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="text-[var(--ink-2)] font-medium">
                        {c.label}
                      </span>
                      <span className="tabular-nums">
                        {formatMoney(Math.round(c.monthly), primaryCurrency)}
                      </span>
                      <span className="text-[var(--muted-2)]">
                        ({Math.round(c.pct)}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Transaction-style list */}
          <div className="life-card overflow-hidden">
            <div className="px-5 py-3 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_180px_160px] gap-4 items-center text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] border-b border-[var(--line)]">
              <span>Service</span>
              <span className="text-right">Cost</span>
              <span className="text-right">Next charge</span>
            </div>
            <ul>
              {sorted.map((row) => (
                <SubscriptionRow
                  key={row.item.id}
                  row={row}
                  onEdit={() => setEditing(row.item)}
                />
              ))}
            </ul>
          </div>
        </>
      )}

      {editing && (
        <SubscriptionModal
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Row
// ──────────────────────────────────────────────────────────────────────

function SubscriptionRow({
  row,
  onEdit,
}: {
  row: SubRow;
  onEdit: () => void;
}) {
  const { item, sub, monthly, color, tint } = row;
  const charge = sub.nextChargeAt ? new Date(sub.nextChargeAt) : null;
  const chargeLabel = nextChargeLabel(sub.nextChargeAt);
  const isOverdue =
    charge !== null && charge.getTime() < Date.now() - 86_400_000;
  const isSoon =
    charge !== null &&
    charge.getTime() > Date.now() &&
    charge.getTime() <= Date.now() + 7 * 86_400_000;

  const cycleLabel = sub.cycle === "monthly" ? "/mo" : `/${sub.cycle[0]}`;
  const showMonthlyEquivalent = sub.cycle !== "monthly";

  return (
    <li
      onClick={onEdit}
      className="group px-5 py-4 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_180px_160px] gap-4 items-center border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--paper-2)] transition cursor-pointer"
    >
      {/* Service: monogram tile + name + category + body */}
      <div className="min-w-0 flex items-center gap-3">
        <span
          className="grid place-items-center w-11 h-11 rounded-[11px] text-[15px] font-semibold tracking-[-0.01em] shrink-0"
          style={{
            background: tint,
            color,
            border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
          }}
        >
          {initial(item.title)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-medium text-[var(--ink)] truncate">
              {item.title || "Untitled"}
            </span>
            {sub.category && (
              <span
                className="text-[10px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color,
                  background: tint,
                }}
              >
                {sub.category}
              </span>
            )}
            {sub.cancelUrl && (
              <a
                href={sub.cancelUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)] hover:text-[var(--terra)] transition"
                title="Open cancel link"
              >
                Manage
                <ExternalLink size={10} strokeWidth={1.6} />
              </a>
            )}
          </div>
          {item.body?.trim() && (
            <p className="mt-0.5 text-[12px] text-[var(--muted)] line-clamp-1 leading-relaxed">
              {item.body}
            </p>
          )}
        </div>
      </div>

      {/* Cost: monthly-equivalent prominent + raw cycle figure secondary */}
      <div className="text-right shrink-0">
        <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--ink)] tracking-[-0.01em] leading-none">
          {formatMoney(
            showMonthlyEquivalent ? Math.round(monthly) : sub.amount,
            sub.currency,
          )}
          <span className="text-[12px] font-normal text-[var(--muted)] ml-0.5">
            /mo
          </span>
        </div>
        {showMonthlyEquivalent && (
          <div className="mt-1 text-[11px] tabular-nums text-[var(--muted-2)] font-mono">
            {formatMoney(sub.amount, sub.currency)}
            <span className="opacity-70">{cycleLabel}</span>
          </div>
        )}
      </div>

      {/* Next charge */}
      <div className="text-right shrink-0">
        {chargeLabel ? (
          <>
            <span
              className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em] font-semibold"
              style={{
                color: isOverdue
                  ? "var(--bad)"
                  : isSoon
                  ? "var(--gold)"
                  : "var(--muted)",
              }}
            >
              {isOverdue ? (
                <AlertCircle size={11} strokeWidth={1.6} />
              ) : (
                <Clock size={11} strokeWidth={1.6} />
              )}
              {chargeLabel}
            </span>
            {charge && (
              <div className="mt-1 text-[11px] text-[var(--muted-2)] font-mono tabular-nums">
                {charge.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </>
        ) : (
          <span className="text-[11.5px] text-[var(--muted-2)] uppercase tracking-[0.1em] font-semibold">
            no date
          </span>
        )}
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Atoms
// ──────────────────────────────────────────────────────────────────────

function SideStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-1 font-mono tabular-nums tracking-[-0.02em] leading-none"
        style={{
          color: color ?? "var(--ink)",
          fontSize: 26,
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <CreditCard size={22} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-medium text-[var(--ink)]">
        Where does your money go each month?
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        Log recurring charges — Claude, Spotify, Apple iCloud, gym, anything.
        Life OS sums them up and warns you a week before each renewal.
      </p>
    </div>
  );
}
