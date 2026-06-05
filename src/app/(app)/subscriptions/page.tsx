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
  CalendarClock,
} from "lucide-react";
import { NewSubscriptionButton, SubscriptionModal } from "./new-subscription";
import {
  formatMoney,
  monthlyEquivalent,
  monthlyTotals,
  nextChargeLabel,
  readSubscription,
  currencySymbol,
  type Cycle,
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

const CYCLE_DAYS: Record<Cycle, number> = {
  weekly: 7,
  monthly: 30.44,
  quarterly: 91.31,
  yearly: 365,
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

type SortKey = "renewal" | "cost" | "category";

export default function SubscriptionsPage() {
  const rows = (useItemsOfKind("subscription") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [view, setView] = useState<"mo" | "yr">("mo");
  const [sortBy, setSortBy] = useState<SortKey>("renewal");

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

  const totals = useMemo(() => monthlyTotals(data.map((d) => d.item)), [data]);
  const primaryCurrency =
    Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";
  const primaryMonthly = totals[primaryCurrency] ?? 0;

  const sortedByRenewal = useMemo(() => {
    return [...data].sort((a, b) => {
      const ta = a.sub.nextChargeAt ? new Date(a.sub.nextChargeAt).getTime() : Infinity;
      const tb = b.sub.nextChargeAt ? new Date(b.sub.nextChargeAt).getTime() : Infinity;
      if (ta !== tb) return ta - tb;
      return b.monthly - a.monthly;
    });
  }, [data]);

  const sortedByCost = useMemo(
    () => [...data].sort((a, b) => b.monthly - a.monthly),
    [data],
  );

  const groups = useMemo(() => {
    const m = new Map<string, { color: string; items: SubRow[]; total: number }>();
    for (const d of data) {
      const label = d.sub.category?.trim() || "Uncategorized";
      const g = m.get(label) ?? { color: d.color, items: [], total: 0 };
      g.items.push(d);
      g.total += d.monthly;
      m.set(label, g);
    }
    return [...m.entries()]
      .map(([label, g]) => ({
        label,
        color: g.color,
        total: g.total,
        items: g.items.sort((a, b) => b.monthly - a.monthly),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const biggest = useMemo(
    () =>
      [...data]
        .filter((d) => d.sub.currency === primaryCurrency)
        .sort((a, b) => b.monthly - a.monthly)[0] ?? null,
    [data, primaryCurrency],
  );

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
      (d) => d.sub.nextChargeAt && new Date(d.sub.nextChargeAt).getTime() <= cutoff,
    ).length;
  }, [data]);

  const upcoming = useMemo(() => {
    const cutoff = Date.now() + 60 * 86_400_000;
    return data
      .map((d) =>
        d.sub.nextChargeAt
          ? { d, t: new Date(d.sub.nextChargeAt).getTime() }
          : null,
      )
      .filter((x): x is { d: SubRow; t: number } => x !== null)
      .filter((x) => x.t <= cutoff)
      .sort((a, b) => a.t - b.t)
      .slice(0, 8);
  }, [data]);

  const bigValue = view === "yr" ? primaryMonthly * 12 : primaryMonthly;
  const sym = currencySymbol(primaryCurrency);

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <CreditCard size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
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
          {/* ── Overview ── */}
          <section className="life-card p-6 mb-5 relative overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: "var(--terra)" }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-6 items-start">
              {/* Total + toggle */}
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                    {view === "yr" ? "Yearly" : "Monthly"} · {primaryCurrency}
                  </span>
                  <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
                    {(["mo", "yr"] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setView(v)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${
                          view === v
                            ? "bg-[var(--paper)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                            : "text-[var(--muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {v === "mo" ? "Monthly" : "Yearly"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex items-baseline gap-3 flex-wrap">
                  <div
                    className="font-mono tabular-nums tracking-[-0.03em] leading-none text-[var(--terra)]"
                    style={{ fontSize: 60, fontWeight: 600 }}
                  >
                    {sym}
                    {bigValue < 100 ? bigValue.toFixed(2) : Math.round(bigValue).toLocaleString()}
                  </div>
                  <div className="text-[13px] text-[var(--muted)] tabular-nums">
                    ≈{" "}
                    {view === "yr"
                      ? `${formatMoney(Math.round(primaryMonthly), primaryCurrency)} / mo`
                      : `${formatMoney(Math.round(primaryMonthly * 12), primaryCurrency)} / yr`}
                  </div>
                </div>

                {Object.entries(totals).filter(([c]) => c !== primaryCurrency).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
                    {Object.entries(totals)
                      .filter(([c]) => c !== primaryCurrency)
                      .map(([currency, monthly]) => (
                        <span key={currency} className="tabular-nums text-[var(--muted)]">
                          <span className="font-semibold text-[var(--ink)]">
                            {formatMoney(
                              Math.round(view === "yr" ? monthly * 12 : monthly),
                              currency,
                            )}
                          </span>{" "}
                          / {view === "yr" ? "yr" : "mo"}
                        </span>
                      ))}
                  </div>
                )}

                {/* stat chips */}
                <div className="mt-5 flex items-center gap-2 flex-wrap">
                  <StatChip label="active" value={String(data.length)} />
                  <StatChip
                    label="renewing 7d"
                    value={String(renewingSoon)}
                    tone={renewingSoon > 0 ? "var(--gold)" : undefined}
                  />
                  {biggest && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)] pl-1.5 pr-3 py-1">
                      <TrendingUp size={11} className="text-[var(--terra)]" />
                      <span className="text-[11px] text-[var(--muted)]">
                        top{" "}
                        <span className="text-[var(--ink)] font-medium">
                          {biggest.item.title}
                        </span>{" "}
                        ·{" "}
                        <span className="tabular-nums">
                          {Math.round((biggest.monthly / (primaryMonthly || 1)) * 100)}%
                        </span>
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Donut breakdown */}
              {categoryShares.length > 0 && (
                <div className="flex items-center gap-5 lg:pl-6 lg:border-l lg:border-[var(--line)]">
                  <Donut
                    slices={categoryShares.map((c) => ({ value: c.monthly, color: c.color }))}
                    total={categoryShares.reduce((s, c) => s + c.monthly, 0)}
                    centerMain={`${sym}${Math.round(primaryMonthly).toLocaleString()}`}
                    centerSub={`${data.length} subs`}
                  />
                  <ul className="flex-1 min-w-0 space-y-1.5">
                    {categoryShares.slice(0, 6).map((c) => (
                      <li key={c.label} className="flex items-center gap-2 text-[12.5px]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: c.color }}
                        />
                        <span className="text-[var(--ink-2)] font-medium truncate flex-1">
                          {c.label}
                        </span>
                        <span className="tabular-nums text-[var(--ink)]">
                          {formatMoney(Math.round(c.monthly), primaryCurrency)}
                        </span>
                        <span className="tabular-nums text-[var(--muted-2)] w-9 text-right">
                          {Math.round(c.pct)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* ── Upcoming renewals ── */}
          {upcoming.length > 0 && (
            <section className="mb-5">
              <div className="flex items-center gap-2 mb-2.5">
                <CalendarClock size={14} className="text-[var(--muted)]" />
                <h2 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--muted)]">
                  Upcoming renewals
                </h2>
                <span className="flex-1 h-px bg-[var(--line)]" />
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
                {upcoming.map(({ d, t }) => {
                  const days = Math.ceil((t - Date.now()) / 86_400_000);
                  const soon = days <= 7;
                  return (
                    <button
                      key={d.item.id}
                      type="button"
                      onClick={() => setEditing(d.item)}
                      className="shrink-0 w-[150px] text-left life-card p-3 hover:border-[var(--terra)]/40 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="grid place-items-center w-8 h-8 rounded-[9px] text-[13px] font-semibold shrink-0"
                          style={{
                            background: d.tint,
                            color: d.color,
                            border: `1px solid color-mix(in oklch, ${d.color} 30%, transparent)`,
                          }}
                        >
                          {initial(d.item.title)}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-[var(--ink)] truncate">
                            {d.item.title}
                          </div>
                          <div className="text-[11px] tabular-nums text-[var(--muted)]">
                            {formatMoney(d.sub.amount, d.sub.currency)}
                          </div>
                        </div>
                      </div>
                      <div
                        className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.08em] font-semibold"
                        style={{ color: soon ? "var(--gold)" : "var(--muted)" }}
                      >
                        <Clock size={10} />
                        {nextChargeLabel(d.sub.nextChargeAt)}
                        <span className="text-[var(--muted-2)] font-normal normal-case tracking-normal">
                          ·{" "}
                          {new Date(t).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── List ── */}
          <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
            <h2 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[var(--muted)]">
              All subscriptions
            </h2>
            <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full bg-[var(--paper-2)] border border-[var(--line)]">
              {(
                [
                  ["renewal", "Renewal"],
                  ["cost", "Cost"],
                  ["category", "Category"],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition ${
                    sortBy === key
                      ? "bg-[var(--paper)] text-[var(--ink)] shadow-[var(--shadow-1)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {sortBy === "category" ? (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.label} className="life-card overflow-hidden">
                  <div className="px-5 py-2.5 flex items-center justify-between bg-[var(--paper-2)] border-b border-[var(--line)]">
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: g.color }}
                      />
                      {g.label}
                      <span className="text-[var(--muted-2)] normal-case tracking-normal">
                        · {g.items.length}
                      </span>
                    </span>
                    <span className="text-[12px] font-mono tabular-nums font-semibold text-[var(--ink)]">
                      {formatMoney(Math.round(g.total), primaryCurrency)}
                      <span className="text-[var(--muted)] font-normal">/mo</span>
                    </span>
                  </div>
                  <ul>
                    {g.items.map((row) => (
                      <SubscriptionRow
                        key={row.item.id}
                        row={row}
                        onEdit={() => setEditing(row.item)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="life-card overflow-hidden">
              <div className="px-5 py-3 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_170px_150px] gap-4 items-center text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] border-b border-[var(--line)]">
                <span>Service</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Next charge</span>
              </div>
              <ul>
                {(sortBy === "cost" ? sortedByCost : sortedByRenewal).map((row) => (
                  <SubscriptionRow
                    key={row.item.id}
                    row={row}
                    onEdit={() => setEditing(row.item)}
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {editing && (
        <SubscriptionModal existing={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Row
// ──────────────────────────────────────────────────────────────────────

function SubscriptionRow({ row, onEdit }: { row: SubRow; onEdit: () => void }) {
  const { item, sub, monthly, color, tint } = row;
  const charge = sub.nextChargeAt ? new Date(sub.nextChargeAt) : null;
  const chargeLabel = nextChargeLabel(sub.nextChargeAt);
  const isOverdue = charge !== null && charge.getTime() < Date.now() - 86_400_000;
  const isSoon =
    charge !== null &&
    charge.getTime() > Date.now() &&
    charge.getTime() <= Date.now() + 7 * 86_400_000;

  const cycleLabel = sub.cycle === "monthly" ? "/mo" : `/${sub.cycle[0]}`;
  const showMonthlyEquivalent = sub.cycle !== "monthly";

  // How far into the current billing cycle we are (for the progress bar).
  const cycleLen = CYCLE_DAYS[sub.cycle];
  const daysUntil = charge ? (charge.getTime() - Date.now()) / 86_400_000 : null;
  const progress =
    daysUntil != null && cycleLen
      ? Math.max(0, Math.min(1, 1 - daysUntil / cycleLen))
      : null;
  const progColor = isOverdue
    ? "var(--bad)"
    : isSoon
      ? "var(--gold)"
      : `color-mix(in oklch, ${color} 65%, transparent)`;

  return (
    <li
      onClick={onEdit}
      className="group px-5 py-4 grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_170px_150px] gap-4 items-center border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--paper-2)] transition cursor-pointer"
    >
      {/* Service */}
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-medium text-[var(--ink)] truncate">
              {item.title || "Untitled"}
            </span>
            {sub.category && (
              <span
                className="text-[10px] uppercase tracking-[0.12em] font-semibold px-2 py-0.5 rounded-full"
                style={{ color, background: tint }}
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
                title="Open manage / cancel link"
              >
                Manage
                <ExternalLink size={10} strokeWidth={1.6} />
              </a>
            )}
          </div>
          {/* Cycle progress */}
          {progress != null && (
            <div
              className="mt-2 h-1 rounded-full bg-[var(--bg-2)] overflow-hidden max-w-[230px]"
              title={`${Math.round(progress * 100)}% through this ${sub.cycle} cycle`}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress * 100}%`, background: progColor }}
              />
            </div>
          )}
          {progress == null && item.body?.trim() && (
            <p className="mt-0.5 text-[12px] text-[var(--muted)] line-clamp-1 leading-relaxed">
              {item.body}
            </p>
          )}
        </div>
      </div>

      {/* Cost */}
      <div className="text-right shrink-0">
        <div className="font-mono tabular-nums text-[18px] font-semibold text-[var(--ink)] tracking-[-0.01em] leading-none">
          {formatMoney(
            showMonthlyEquivalent ? Math.round(monthly) : sub.amount,
            sub.currency,
          )}
          <span className="text-[12px] font-normal text-[var(--muted)] ml-0.5">/mo</span>
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
                color: isOverdue ? "var(--bad)" : isSoon ? "var(--gold)" : "var(--muted)",
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
                {charge.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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

function Donut({
  slices,
  total,
  centerMain,
  centerSub,
  size = 134,
  stroke = 17,
}: {
  slices: { value: number; color: string }[];
  total: number;
  centerMain: string;
  centerSub: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={stroke} />
          {total > 0 &&
            slices.map((s, i) => {
              const frac = s.value / total;
              const dash = Math.max(0, frac * c - (slices.length > 1 ? 2 : 0));
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cx}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += frac * c;
              return el;
            })}
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Monthly
          </div>
          <div className="font-mono tabular-nums text-[19px] font-semibold text-[var(--ink)] leading-tight">
            {centerMain}
          </div>
          <div className="text-[10px] text-[var(--muted-2)]">{centerSub}</div>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--paper-2)] border border-[var(--line)] pl-3 pr-3 py-1">
      <span
        className="text-[14px] font-semibold tabular-nums"
        style={{ color: tone ?? "var(--ink)" }}
      >
        {value}
      </span>
      <span className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </span>
    </span>
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
