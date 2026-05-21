"use client";

import { useMemo, useState } from "react";
import { useItemsOfKind } from "@/lib/store/items";
import type { StoredItem } from "@/lib/store/items";
import {
  CreditCard,
  ExternalLink,
  Clock,
  AlertCircle,
} from "lucide-react";
import { NewSubscriptionButton, SubscriptionModal } from "./new-subscription";
import {
  formatMoney,
  monthlyEquivalent,
  monthlyTotals,
  nextChargeLabel,
  readSubscription,
} from "@/lib/subscriptions";

export default function SubscriptionsPage() {
  const rows = (useItemsOfKind("subscription") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);

  const active = useMemo(
    () => rows.filter((r) => r.status !== "archived"),
    [rows],
  );
  const totals = useMemo(() => monthlyTotals(active), [active]);

  // Renewing soon = next charge within 7 days.
  const renewingSoon = useMemo(() => {
    const cutoff = Date.now() + 7 * 86_400_000;
    return active.filter((r) => {
      const sub = readSubscription(r);
      if (!sub?.nextChargeAt) return false;
      const t = new Date(sub.nextChargeAt).getTime();
      return t <= cutoff;
    }).length;
  }, [active]);

  const sorted = useMemo(() => {
    return [...active].sort((a, b) => {
      const sa = readSubscription(a);
      const sb = readSubscription(b);
      // Items with a date first, ordered by soonest charge.
      const ta = sa?.nextChargeAt
        ? new Date(sa.nextChargeAt).getTime()
        : Infinity;
      const tb = sb?.nextChargeAt
        ? new Date(sb.nextChargeAt).getTime()
        : Infinity;
      if (ta !== tb) return ta - tb;
      // Then by monthly cost (high → low) so the expensive ones are obvious.
      const ma = sa ? monthlyEquivalent(sa.amount, sa.cycle) : 0;
      const mb = sb ? monthlyEquivalent(sb.amount, sb.cycle) : 0;
      return mb - ma;
    });
  }, [active]);

  return (
    <div className="p-8 max-w-5xl mx-auto pg-enter">
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

      {active.length === 0 ? (
        <EmptyHero />
      ) : (
        <>
          {/* Totals row — one tile per currency in use */}
          <div
            className="grid gap-3 life-stagger mb-6"
            style={{
              gridTemplateColumns: `repeat(${
                Object.keys(totals).length + 1
              }, minmax(0, 1fr))`,
            }}
          >
            {Object.entries(totals).map(([currency, monthly]) => (
              <Stat
                key={currency}
                label={`Monthly · ${currency}`}
                value={formatMoney(Math.round(monthly), currency)}
                hint={`≈ ${formatMoney(
                  Math.round(monthly * 12),
                  currency,
                )} / year`}
                tone="terra"
              />
            ))}
            <Stat
              label="Renewing this week"
              value={renewingSoon}
              tone={renewingSoon > 0 ? "gold" : "ink"}
            />
          </div>

          {/* List */}
          <div className="life-card overflow-hidden">
            <div className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_120px_120px_auto] gap-4 items-center text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] border-b border-[var(--line)]">
              <span>Service</span>
              <span className="text-right hidden sm:block">Cost</span>
              <span className="text-right">Next charge</span>
              <span className="hidden sm:block w-[68px]" aria-hidden />
            </div>
            <ul>
              {sorted.map((item) => (
                <SubscriptionRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
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

function SubscriptionRow({
  item,
  onEdit,
}: {
  item: StoredItem;
  onEdit: () => void;
}) {
  const sub = readSubscription(item);
  if (!sub) return null;
  const monthly = monthlyEquivalent(sub.amount, sub.cycle);
  const cycleLabel = sub.cycle === "monthly" ? "/mo" : `/${sub.cycle[0]}`;
  const charge = sub.nextChargeAt
    ? new Date(sub.nextChargeAt)
    : null;
  const chargeLabel = nextChargeLabel(sub.nextChargeAt);
  const isOverdue =
    charge !== null && charge.getTime() < Date.now() - 86_400_000;
  const isSoon =
    charge !== null &&
    charge.getTime() > Date.now() &&
    charge.getTime() <= Date.now() + 7 * 86_400_000;

  return (
    <li
      onClick={onEdit}
      className="group px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_120px_120px_auto] gap-4 items-center border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--paper-2)] transition cursor-pointer"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-medium text-[var(--ink)] truncate">
            {item.title || "Untitled"}
          </span>
          {sub.category && (
            <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--muted)] bg-[var(--bg-2)] px-2 py-0.5 rounded-full">
              {sub.category}
            </span>
          )}
        </div>
        {item.body?.trim() && (
          <p className="mt-1 text-[12.5px] text-[var(--muted)] line-clamp-1 leading-relaxed">
            {item.body}
          </p>
        )}
      </div>

      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-[14px] font-semibold tabular-nums font-mono text-[var(--ink)]">
          {formatMoney(sub.amount, sub.currency)}
          <span className="text-[11px] text-[var(--muted)] ml-0.5">
            {cycleLabel}
          </span>
        </div>
        {sub.cycle !== "monthly" && (
          <div className="text-[10.5px] tabular-nums text-[var(--muted-2)]">
            ≈ {formatMoney(Math.round(monthly), sub.currency)}/mo
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        {chargeLabel ? (
          <span
            className="inline-flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.1em] font-semibold"
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
        ) : (
          <span className="text-[11.5px] text-[var(--muted-2)] uppercase tracking-[0.1em] font-semibold">
            no date
          </span>
        )}
      </div>

      <div className="hidden sm:block w-[68px] text-right">
        {sub.cancelUrl && (
          <a
            href={sub.cancelUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open cancel link"
            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-[11.5px] text-[var(--muted)] hover:text-[var(--terra)] transition"
          >
            Manage
            <ExternalLink size={10} strokeWidth={1.6} />
          </a>
        )}
      </div>
    </li>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Atoms
// ──────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone: "ink" | "terra" | "gold" | "sage";
}) {
  const color =
    tone === "terra"
      ? "var(--terra)"
      : tone === "gold"
      ? "var(--gold)"
      : tone === "sage"
      ? "var(--sage)"
      : "var(--ink)";
  return (
    <div className="life-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-[28px] sm:text-[32px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-[11px] text-[var(--muted)]">{hint}</div>
      )}
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
