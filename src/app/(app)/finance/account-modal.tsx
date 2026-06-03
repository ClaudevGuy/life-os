"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Landmark, X, Trash2 } from "lucide-react";
import {
  captureItem,
  updateItem,
  deleteItem,
  type StoredItem,
} from "@/lib/store/items";
import { Portal } from "@/components/portal";
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  CURRENCIES,
  readAccount,
  type AccountType,
} from "@/lib/finance";

export function NewAccountButton() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        Add account
      </button>
    );
  }
  return <AccountModal existing={null} onClose={() => setOpen(false)} />;
}

export function AccountModal({
  existing,
  onClose,
}: {
  existing: StoredItem | null;
  onClose: () => void;
}) {
  const initial = existing ? readAccount(existing) : null;
  const [accountType, setAccountType] = useState<AccountType>(
    initial?.accountType ?? "asset",
  );
  const [name, setName] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(
    initial?.category ?? ASSET_CATEGORIES[0],
  );
  const [balance, setBalance] = useState(
    initial ? String(initial.balance) : "",
  );
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [notes, setNotes] = useState(existing?.body ?? "");
  const [pending, startTransition] = useTransition();

  const categories =
    accountType === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  // Keep the category valid when the asset/liability toggle flips.
  useEffect(() => {
    if (!(categories as readonly string[]).includes(category)) {
      setCategory(categories[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const balanceNum = Number(balance);
  const accent = accountType === "asset" ? "var(--sage)" : "var(--bad)";
  const accentTint =
    accountType === "asset" ? "var(--sage-tint)" : "var(--terra-tint)";

  function save() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    if (!Number.isFinite(balanceNum) || balanceNum < 0) {
      toast.error("Balance must be a number (0 or more)");
      return;
    }
    const meta = {
      accountType,
      category,
      balance: balanceNum,
      currency,
      institution: institution.trim() || undefined,
    };
    startTransition(async () => {
      try {
        if (existing) {
          await updateItem(existing.id, {
            title: name.trim(),
            body: notes.trim() || null,
            metadata: meta,
          });
          toast.success("Updated");
        } else {
          await captureItem({
            kind: "account",
            title: name.trim(),
            body: notes.trim() || null,
            status: "active",
            metadata: meta,
          });
          toast.success("Account added");
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
    if (!confirm(`Delete "${existing.title}"? This can't be undone.`)) return;
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
              <Landmark size={15} strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {existing ? "Edit account" : "New account"}
              </div>
              <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
                {name.trim() || "Untitled"}
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
            {/* Asset / liability */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)]">
              {(["asset", "liability"] as AccountType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAccountType(t)}
                  className={`text-[13px] capitalize px-3 py-1.5 rounded-[7px] font-medium transition ${
                    accountType === t
                      ? "bg-[var(--paper)] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                  style={
                    accountType === t ? { boxShadow: "var(--shadow-1)" } : undefined
                  }
                >
                  {t === "asset" ? "Asset (you own)" : "Liability (you owe)"}
                </button>
              ))}
            </div>

            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Chase Checking, Cash, Car loan…"
                autoFocus
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>

            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition appearance-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label={accountType === "asset" ? "Balance" : "Amount owed"}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] font-mono tabular-nums text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                />
              </Field>
              <Field label="Currency">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition appearance-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label={
                <>
                  Institution{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (optional)
                  </span>
                </>
              }
            >
              <input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Chase, Fidelity, Coinbase…"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>

            <Field
              label={
                <>
                  Notes{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (optional)
                  </span>
                </>
              }
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Account number tail, who it's with, etc."
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] resize-y transition leading-relaxed"
              />
            </Field>
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
