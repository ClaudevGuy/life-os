"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  X,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  KeyRound,
  CreditCard,
  Hash,
  Fingerprint,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { Portal } from "@/components/portal";
import { useVault } from "@/components/vault/vault-provider";
import {
  VAULT_TYPES,
  TYPE_FIELDS,
  type VaultEntry,
  type VaultType,
} from "@/lib/vault/types";

export const TYPE_ICON: Record<VaultType, LucideIcon> = {
  login: KeyRound,
  card: CreditCard,
  codes: Hash,
  secret: Fingerprint,
  note: StickyNote,
};

export function ItemModal({
  existing,
  onClose,
}: {
  existing: VaultEntry | null;
  onClose: () => void;
}) {
  const vault = useVault();
  const [type, setType] = useState<VaultType>(existing?.type ?? "login");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [data, setData] = useState<Record<string, string>>(existing?.data ?? {});
  const [showSecrets, setShowSecrets] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fields = TYPE_FIELDS[type];
  const Icon = TYPE_ICON[type];

  function setField(key: string, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function save() {
    if (!title.trim()) {
      toast.error("Give it a name");
      return;
    }
    // Keep only fields that belong to the chosen type.
    const cleaned: Record<string, string> = {};
    for (const f of fields) {
      const v = (data[f.key] ?? "").trim();
      if (v) cleaned[f.key] = v;
    }
    start(async () => {
      try {
        if (existing) await vault.editItem(existing.id, title.trim(), cleaned);
        else await vault.addItem(type, title.trim(), cleaned);
        toast.success(existing ? "Updated" : "Saved to vault");
        onClose();
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  function remove() {
    if (!existing) return;
    if (!confirm(`Delete "${existing.title}"? This can't be undone.`)) return;
    start(async () => {
      try {
        await vault.removeItem(existing.id);
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
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[7vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 pb-3 flex items-start gap-3 border-b border-[var(--line)]">
            <div
              className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
              style={{
                background: "color-mix(in oklch, var(--terra) 14%, transparent)",
                color: "var(--terra)",
              }}
            >
              <Icon size={15} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                {existing ? "Edit item" : "New vault item"}
              </div>
              <div className="mt-0.5 text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] truncate">
                {title.trim() || "Untitled"}
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
            {/* Type */}
            <div className="flex flex-wrap gap-1.5">
              {VAULT_TYPES.map((t) => {
                const TIcon = TYPE_ICON[t.type];
                const on = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setType(t.type)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition ${
                      on
                        ? "bg-[var(--terra)] text-white border-[var(--terra)]"
                        : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)]"
                    }`}
                  >
                    <TIcon size={12} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <Field label="Name">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="GitHub, Visa •1234, Wi-Fi password…"
                autoFocus
                className={inputCls}
              />
            </Field>

            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                Details
              </span>
              <button
                type="button"
                onClick={() => setShowSecrets((s) => !s)}
                className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                {showSecrets ? <EyeOff size={13} /> : <Eye size={13} />}
                {showSecrets ? "Hide" : "Reveal"}
              </button>
            </div>

            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.textarea ? (
                  <textarea
                    value={data[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={f.key === "codes" ? 4 : 2}
                    className={`${inputCls} resize-y leading-relaxed ${
                      f.secret ? "font-mono" : ""
                    }`}
                    style={
                      f.secret && !showSecrets
                        ? ({ WebkitTextSecurity: "disc" } as unknown as React.CSSProperties)
                        : undefined
                    }
                  />
                ) : (
                  <div className="relative">
                    <input
                      type={f.secret && !showSecrets ? "password" : "text"}
                      value={data[f.key] ?? ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      autoComplete="off"
                      className={`${inputCls} ${f.secret ? "font-mono pr-10" : ""}`}
                    />
                    {f.secret && (data[f.key] ?? "") && (
                      <CopyBtn value={data[f.key]} />
                    )}
                  </div>
                )}
              </Field>
            ))}
          </div>

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

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* ignore */
        }
      }}
      aria-label="Copy"
      className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--terra)] transition"
    >
      {done ? <Check size={14} className="text-[var(--sage)]" /> : <Copy size={14} />}
    </button>
  );
}

const inputCls =
  "w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition";

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
