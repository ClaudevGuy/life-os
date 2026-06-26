"use client";

import type { LucideIcon } from "lucide-react";
import { kgToUnit, type WeightUnit } from "@/lib/store/health";

/** A kg weight rendered in the chosen unit, e.g. "72.5" (no trailing ".0"). */
export function fmtWeight(kg: number, unit: WeightUnit): string {
  const v = Math.round(kgToUnit(kg, unit) * 10) / 10;
  return Number.isInteger(v) ? v.toString() : v.toFixed(1);
}

export function StatTile({
  label,
  value,
  suffix,
  tone = "var(--ink)",
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: string;
}) {
  return (
    <div className="life-card p-4">
      <div className="text-[10px] uppercase tracking-[0.13em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-1.5 text-[23px] font-semibold tabular-nums leading-none"
        style={{ color: tone }}
      >
        {value}
        {suffix && (
          <span className="ml-1 text-[12px] font-medium text-[var(--muted)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Icon size={23} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-semibold text-[var(--ink)]">{title}</div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
        {body}
      </p>
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </div>
  );
}

/** A selectable chip — used for focus tags and filters. */
export function Chip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition active:scale-[0.97] ${
        active
          ? "text-white"
          : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)]"
      }`}
      style={active ? { background: color ?? "var(--terra)" } : undefined}
    >
      {children}
    </button>
  );
}
