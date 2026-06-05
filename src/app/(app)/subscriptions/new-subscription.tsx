"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, CreditCard, X, ExternalLink, Trash2 } from "lucide-react";
import {
  captureItem,
  updateItem,
  deleteItem,
  type StoredItem,
} from "@/lib/store/items";
import { Portal } from "@/components/portal";
import {
  CYCLES,
  CURRENCIES,
  formatMoney,
  monthlyEquivalent,
  readSubscription,
  type Cycle,
} from "@/lib/subscriptions";

export function NewSubscriptionButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="life-btn life-btn-sm life-btn-primary"
      >
        <Plus size={13} strokeWidth={2} />
        New subscription
      </button>
    );
  }

  return (
    <SubscriptionModal existing={null} onClose={() => setOpen(false)} />
  );
}

export function SubscriptionModal({
  existing,
  onClose,
}: {
  existing: StoredItem | null;
  onClose: () => void;
}) {
  const initialMeta = existing ? readSubscription(existing) : null;
  const [name, setName] = useState(existing?.title ?? "");
  const [amount, setAmount] = useState<string>(
    initialMeta ? String(initialMeta.amount) : "",
  );
  const [currency, setCurrency] = useState(initialMeta?.currency ?? "USD");
  const [cycle, setCycle] = useState<Cycle>(initialMeta?.cycle ?? "monthly");
  const [nextCharge, setNextCharge] = useState(
    initialMeta?.nextChargeAt?.slice(0, 10) ?? "",
  );
  const [category, setCategory] = useState(initialMeta?.category ?? "");
  const [cancelUrl, setCancelUrl] = useState(initialMeta?.cancelUrl ?? "");
  const [website, setWebsite] = useState(initialMeta?.website ?? "");
  const [notes, setNotes] = useState(existing?.body ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const amountNum = Number(amount);
  const monthly = useMemo(
    () => (Number.isFinite(amountNum) ? monthlyEquivalent(amountNum, cycle) : 0),
    [amountNum, cycle],
  );

  function save() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    const meta = {
      amount: amountNum,
      currency,
      cycle,
      nextChargeAt: nextCharge
        ? new Date(`${nextCharge}T09:00:00`).toISOString()
        : undefined,
      category: category.trim() || undefined,
      cancelUrl: cancelUrl.trim() || undefined,
      website: website.trim() || undefined,
      paused: initialMeta?.paused || undefined,
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
            kind: "subscription",
            title: name.trim(),
            body: notes.trim() || null,
            status: "active",
            metadata: meta,
          });
          toast.success("Subscription added");
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
              style={{
                background: "var(--gold-tint)",
                color: "var(--gold)",
              }}
            >
              <CreditCard size={15} strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {existing ? "Edit subscription" : "New subscription"}
              </div>
              <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
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
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Claude, Spotify, Netflix…"
                autoFocus
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Amount">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="9.99"
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

            <Field label="Cycle">
              <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)]">
                {CYCLES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={`text-[12.5px] capitalize px-3 py-1 rounded-[7px] font-medium transition ${
                      cycle === c
                        ? "bg-[var(--paper)] text-[var(--ink)]"
                        : "text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                    style={
                      cycle === c ? { boxShadow: "var(--shadow-1)" } : undefined
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              {Number.isFinite(amountNum) && amountNum > 0 && cycle !== "monthly" && (
                <p className="mt-2 text-[11.5px] text-[var(--muted)]">
                  ≈ {formatMoney(monthly, currency)} / month
                </p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Next charge">
                <input
                  type="date"
                  value={nextCharge}
                  onChange={(e) => setNextCharge(e.target.value)}
                  className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] text-[var(--ink)] focus:outline-none focus:border-[var(--terra)] transition tabular-nums"
                />
              </Field>
              <Field
                label={
                  <>
                    Category{" "}
                    <span className="opacity-60 normal-case tracking-normal font-normal">
                      (optional)
                    </span>
                  </>
                }
              >
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="AI, Streaming…"
                  className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                />
              </Field>
            </div>

            <Field
              label={
                <>
                  Website{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (shows the logo)
                  </span>
                </>
              }
            >
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://service.com"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </Field>

            <Field
              label={
                <>
                  Cancel URL{" "}
                  <span className="opacity-60 normal-case tracking-normal font-normal">
                    (optional)
                  </span>
                </>
              }
            >
              <input
                type="url"
                value={cancelUrl}
                onChange={(e) => setCancelUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
              {cancelUrl.trim() && (
                <a
                  href={cancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[var(--terra)] hover:underline"
                >
                  Open <ExternalLink size={10} strokeWidth={1.6} />
                </a>
              )}
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
                placeholder="What plan, whose card, etc."
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
