"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Coins, LineChart, X, Trash2 } from "lucide-react";
import {
  captureItem,
  updateItem,
  deleteItem,
  type StoredItem,
} from "@/lib/store/items";
import { Portal } from "@/components/portal";
import {
  COIN_CATALOG,
  STOCK_CATALOG,
  readHolding,
  type AssetClass,
} from "@/lib/finance";

export function NewHoldingButton() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-ghost"
      >
        <Plus size={13} strokeWidth={2} />
        Add holding
      </button>
    );
  }
  return <HoldingModal existing={null} onClose={() => setOpen(false)} />;
}

export function HoldingModal({
  existing,
  onClose,
}: {
  existing: StoredItem | null;
  onClose: () => void;
}) {
  const initial = existing ? readHolding(existing) : null;
  const [assetClass, setAssetClass] = useState<AssetClass>(
    initial?.assetClass ?? "crypto",
  );
  const [coinId, setCoinId] = useState(initial?.coinId ?? COIN_CATALOG[0].id);
  const [stockSymbol, setStockSymbol] = useState(
    initial?.assetClass === "stock" ? initial.symbol : "",
  );
  const [stockName, setStockName] = useState(
    initial?.assetClass === "stock" ? existing?.title ?? "" : "",
  );
  const [quantity, setQuantity] = useState(
    initial ? String(initial.quantity) : "",
  );
  const [costBasis, setCostBasis] = useState(
    initial?.costBasis != null ? String(initial.costBasis) : "",
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const coin = useMemo(
    () => COIN_CATALOG.find((c) => c.id === coinId) ?? COIN_CATALOG[0],
    [coinId],
  );
  const qtyNum = Number(quantity);
  const costNum = costBasis.trim() ? Number(costBasis) : undefined;

  const accent = assetClass === "crypto" ? "var(--gold)" : "var(--sky)";
  const accentTint =
    assetClass === "crypto" ? "var(--gold-tint)" : "var(--sky-tint)";
  const Icon = assetClass === "crypto" ? Coins : LineChart;

  const displayName =
    assetClass === "crypto"
      ? coin.name
      : stockName.trim() ||
        STOCK_CATALOG.find((s) => s.symbol === stockSymbol.toUpperCase())?.name ||
        stockSymbol.toUpperCase() ||
        "Untitled";

  function save() {
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }
    if (costNum != null && (!Number.isFinite(costNum) || costNum < 0)) {
      toast.error("Cost basis must be a number");
      return;
    }

    let meta: Record<string, unknown>;
    let title: string;
    if (assetClass === "crypto") {
      meta = {
        assetClass: "crypto",
        symbol: coin.symbol,
        coinId: coin.id,
        quantity: qtyNum,
        costBasis: costNum,
        currency: "USD",
      };
      title = coin.name;
    } else {
      const sym = stockSymbol.trim().toUpperCase();
      if (!sym) {
        toast.error("Ticker symbol required");
        return;
      }
      const name =
        stockName.trim() ||
        STOCK_CATALOG.find((s) => s.symbol === sym)?.name ||
        sym;
      meta = {
        assetClass: "stock",
        symbol: sym,
        quantity: qtyNum,
        costBasis: costNum,
        currency: "USD",
      };
      title = name;
    }

    startTransition(async () => {
      try {
        if (existing) {
          await updateItem(existing.id, { title, metadata: meta });
          toast.success("Updated");
        } else {
          await captureItem({
            kind: "holding",
            title,
            status: "active",
            metadata: meta,
          });
          toast.success("Holding added");
        }
      } catch {
        toast.error("Couldn't save");
        return;
      }
      onClose();
    });
  }

  function remove() {
    if (!existing) return;
    if (!confirm(`Delete this holding? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteItem(existing.id);
        toast.success("Deleted");
        onClose();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 pb-3 flex items-start gap-3 border-b border-[var(--line)]">
            <div
              className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
              style={{ background: accentTint, color: accent }}
            >
              <Icon size={15} strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {existing ? "Edit holding" : "New holding"}
              </div>
              <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
                {displayName}
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

          {/* Form */}
          <div className="p-5 space-y-4">
            {/* Crypto / stock */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)]">
              {(["crypto", "stock"] as AssetClass[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAssetClass(t)}
                  className={`text-[13px] capitalize px-3 py-1.5 rounded-[7px] font-medium transition ${
                    assetClass === t
                      ? "bg-[var(--paper)] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                  style={
                    assetClass === t ? { boxShadow: "var(--shadow-1)" } : undefined
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            {assetClass === "crypto" ? (
              <Field label="Coin">
                <select
                  value={coinId}
                  onChange={(e) => setCoinId(e.target.value)}
                  className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition appearance-none"
                >
                  {COIN_CATALOG.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.symbol}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Field label="Ticker">
                  <input
                    value={stockSymbol}
                    onChange={(e) =>
                      setStockSymbol(e.target.value.toUpperCase())
                    }
                    list="stock-suggestions"
                    placeholder="AAPL"
                    autoFocus
                    className="w-28 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] font-mono uppercase tracking-wide text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                  />
                  <datalist id="stock-suggestions">
                    {STOCK_CATALOG.map((s) => (
                      <option key={s.symbol} value={s.symbol}>
                        {s.name}
                      </option>
                    ))}
                  </datalist>
                </Field>
                <Field
                  label={
                    <>
                      Name{" "}
                      <span className="opacity-60 normal-case tracking-normal font-normal">
                        (optional)
                      </span>
                    </>
                  }
                >
                  <input
                    value={stockName}
                    onChange={(e) => setStockName(e.target.value)}
                    placeholder="Apple"
                    className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                  />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.5"
                  className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] font-mono tabular-nums text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                />
              </Field>
              <Field
                label={
                  <>
                    Cost basis{" "}
                    <span className="opacity-60 normal-case tracking-normal font-normal">
                      (optional)
                    </span>
                  </>
                }
              >
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={costBasis}
                  onChange={(e) => setCostBasis(e.target.value)}
                  placeholder="Total $ paid"
                  className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] font-mono tabular-nums text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                />
              </Field>
            </div>

            <p className="text-[11.5px] text-[var(--muted)] leading-relaxed">
              Valued live in USD. Enter total cost basis to track profit &amp;
              loss.
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-2)] flex items-center justify-between gap-3">
            {existing ? (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--bad)] transition"
              >
                <Trash2 size={12} strokeWidth={1.6} />
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="life-btn life-btn-sm life-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="life-btn life-btn-sm life-btn-primary"
              >
                {existing ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}
