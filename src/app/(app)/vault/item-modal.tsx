"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  Braces,
  Wand2,
  RefreshCw,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Portal } from "@/components/portal";
import { useVault } from "@/components/vault/vault-provider";
import {
  VAULT_TYPES,
  TYPE_FIELDS,
  passcodeStrength,
  type VaultEntry,
  type VaultField,
  type VaultType,
} from "@/lib/vault/types";
import { monogram } from "@/lib/vault/avatar";
import {
  generatePassword,
  DEFAULT_GEN,
  GEN_MIN,
  GEN_MAX,
  type GenOpts,
} from "@/lib/vault/generate";

export const TYPE_ICON: Record<VaultType, LucideIcon> = {
  login: KeyRound,
  card: CreditCard,
  codes: Hash,
  api: Braces,
  secret: Fingerprint,
  note: StickyNote,
};

export function ItemModal({
  existing,
  initialType = "login",
  onClose,
}: {
  existing: VaultEntry | null;
  initialType?: VaultType;
  onClose: () => void;
}) {
  const vault = useVault();
  const [type, setType] = useState<VaultType>(existing?.type ?? initialType);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [data, setData] = useState<Record<string, string>>(existing?.data ?? {});
  const [showSecrets, setShowSecrets] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [pending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const fields = TYPE_FIELDS[type];
  const mono = monogram(title);

  function setField(key: string, value: string) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function save(again = false) {
    if (!title.trim()) {
      toast.error("Give it a name");
      nameRef.current?.focus();
      return;
    }
    const cleaned: Record<string, string> = {};
    for (const f of fields) {
      const v = (data[f.key] ?? "").trim();
      if (v) cleaned[f.key] = v;
    }
    start(async () => {
      try {
        if (existing) {
          await vault.editItem(existing.id, title.trim(), cleaned);
          toast.success("Updated");
          onClose();
          return;
        }
        await vault.addItem(type, title.trim(), cleaned);
        if (again) {
          toast.success("Saved — add another");
          setTitle("");
          setData({});
          setShowSecrets(false);
          nameRef.current?.focus();
        } else {
          toast.success("Saved to vault");
          onClose();
        }
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  // Keep a live pointer to save so the keyboard handler never goes stale.
  const saveRef = useRef<() => void>(() => {});
  saveRef.current = () => save(addAnother && !existing);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveRef.current();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const Icon = TYPE_ICON[type];

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
            {type === "login" ? (
              <div
                className="grid place-items-center w-9 h-9 rounded-[10px] shrink-0 text-white text-[15px] font-semibold"
                style={{ background: mono.color }}
              >
                {mono.letter}
              </div>
            ) : (
              <div
                className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
                style={{
                  background: "color-mix(in oklch, var(--terra) 14%, transparent)",
                  color: "var(--terra)",
                }}
              >
                <Icon size={15} strokeWidth={1.7} />
              </div>
            )}
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
                    disabled={!!existing}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed ${
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
                ref={nameRef}
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

            {fields.map((f) =>
              f.generate ? (
                <GeneratableField
                  key={f.key}
                  field={f}
                  value={data[f.key] ?? ""}
                  reveal={showSecrets}
                  onReveal={() => setShowSecrets(true)}
                  onChange={(v) => setField(f.key, v)}
                />
              ) : (
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
              ),
            )}
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
              <button
                type="button"
                onClick={() => setAddAnother((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--ink)] transition"
                aria-pressed={addAnother}
                title="Stay open and clear the form after saving"
              >
                <span
                  className="grid place-items-center w-[15px] h-[15px] rounded-[4px] border transition"
                  style={{
                    borderColor: addAnother ? "var(--terra)" : "var(--line-2)",
                    background: addAnother ? "var(--terra)" : "transparent",
                    color: "white",
                  }}
                >
                  {addAnother && <Check size={10} strokeWidth={3} />}
                </span>
                Save &amp; add another
              </button>
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
                onClick={() => save(addAnother && !existing)}
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

/** A secret field with a built-in password generator + strength meter. */
function GeneratableField({
  field,
  value,
  reveal,
  onReveal,
  onChange,
}: {
  field: VaultField;
  value: string;
  reveal: boolean;
  onReveal: () => void;
  onChange: (v: string) => void;
}) {
  const [optsOpen, setOptsOpen] = useState(false);
  const [opts, setOpts] = useState<GenOpts>(DEFAULT_GEN);
  const strength = passcodeStrength(value);

  function gen(next: GenOpts = opts) {
    onChange(generatePassword(next));
    onReveal();
  }

  const masked = !reveal;

  return (
    <div className="block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          {field.label}
        </span>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => gen()}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--terra)] hover:opacity-80 transition"
          >
            <Wand2 size={13} />
            Generate
          </button>
          <button
            type="button"
            onClick={() => setOptsOpen((o) => !o)}
            aria-label="Generator options"
            aria-expanded={optsOpen}
            className="grid place-items-center w-6 h-6 rounded-md text-[var(--muted-2)] hover:text-[var(--ink)] transition"
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>
      </div>

      {field.textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className={`${inputCls} resize-y leading-relaxed font-mono`}
          style={
            masked
              ? ({ WebkitTextSecurity: "disc" } as unknown as React.CSSProperties)
              : undefined
          }
        />
      ) : (
        <div className="relative">
          <input
            type={masked ? "password" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            autoComplete="off"
            className={`${inputCls} font-mono pr-10`}
          />
          {value && <CopyBtn value={value} />}
        </div>
      )}

      {value && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(strength.score / 4) * 100}%`,
                background:
                  strength.score >= 3
                    ? "var(--sage)"
                    : strength.score >= 2
                      ? "var(--gold)"
                      : "var(--bad)",
              }}
            />
          </div>
          <span className="text-[11px] text-[var(--muted)] w-14 text-right">
            {strength.label}
          </span>
        </div>
      )}

      {optsOpen && (
        <div className="mt-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[11.5px] text-[var(--muted)]">Length</span>
            <input
              type="range"
              min={GEN_MIN}
              max={GEN_MAX}
              value={opts.length ?? DEFAULT_GEN.length}
              onChange={(e) => {
                const length = Number(e.target.value);
                setOpts((o) => ({ ...o, length }));
              }}
              className="flex-1 accent-[var(--terra)]"
            />
            <span className="text-[12px] font-mono tabular-nums text-[var(--ink)] w-6 text-right">
              {opts.length ?? DEFAULT_GEN.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <GenToggle label="A-Z" on={opts.upper ?? true} onClick={() => setOpts((o) => ({ ...o, upper: !(o.upper ?? true) }))} />
            <GenToggle label="a-z" on={opts.lower ?? true} onClick={() => setOpts((o) => ({ ...o, lower: !(o.lower ?? true) }))} />
            <GenToggle label="0-9" on={opts.digits ?? true} onClick={() => setOpts((o) => ({ ...o, digits: !(o.digits ?? true) }))} />
            <GenToggle label="!#$" on={opts.symbols ?? true} onClick={() => setOpts((o) => ({ ...o, symbols: !(o.symbols ?? true) }))} />
            <GenToggle label="No look-alikes" on={opts.avoidAmbiguous ?? false} onClick={() => setOpts((o) => ({ ...o, avoidAmbiguous: !(o.avoidAmbiguous ?? false) }))} />
          </div>
          <button
            type="button"
            onClick={() => gen()}
            className="w-full life-btn life-btn-sm life-btn-ghost justify-center"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

function GenToggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
        on
          ? "bg-[var(--terra)] text-white border-[var(--terra)]"
          : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </button>
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
