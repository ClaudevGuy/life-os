"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Lock,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Settings2,
  X,
  KeyRound,
} from "lucide-react";
import { useVault } from "@/components/vault/vault-provider";
import { LockScreen } from "@/components/vault/lock-screen";
import { Portal } from "@/components/portal";
import {
  primaryField,
  subtitleFor,
  VAULT_TYPE_LABEL,
  passcodeStrength,
  type VaultEntry,
  type VaultType,
} from "@/lib/vault/types";
import { ItemModal, TYPE_ICON } from "./item-modal";

export default function VaultPage() {
  const vault = useVault();

  if (!vault.ready) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-40 rounded-2xl bg-[var(--bg-2)] animate-pulse" />
      </div>
    );
  }

  if (!vault.hasPasscode) {
    return (
      <Centered>
        <LockScreen
          mode="setup"
          onSubmit={vault.setup}
          title="Set up your vault"
          subtitle="Choose a passcode. It encrypts your logins, cards, and secrets on this device — there's no recovery, so keep it safe."
        />
      </Centered>
    );
  }

  if (!vault.unlocked) {
    return (
      <Centered>
        <LockScreen
          mode="unlock"
          onSubmit={vault.unlock}
          onForgot={async () => {
            if (
              confirm(
                "Reset the vault? This permanently deletes everything in it and removes your passcode. This cannot be undone.",
              )
            ) {
              await vault.resetVault();
            }
          }}
        />
      </Centered>
    );
  }

  return <VaultDashboard />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto pg-enter">
      <div className="min-h-[60vh] grid place-items-center">{children}</div>
    </div>
  );
}

function VaultDashboard() {
  const vault = useVault();
  const items = vault.items ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<VaultType | "all">("all");
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const typesPresent = useMemo(
    () => Array.from(new Set(items.map((i) => i.type))),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.type !== filter) return false;
      if (!q) return true;
      const hay = [i.title, ...Object.values(i.data)].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, filter]);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto pg-enter space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Shield size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
            Vault
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--sage)]" />
            Encrypted on this device. Never leaves it, never synced.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="grid place-items-center w-9 h-9 rounded-[10px] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)] transition"
            title="Vault settings"
            aria-label="Vault settings"
          >
            <Settings2 size={16} />
          </button>
          <button
            type="button"
            onClick={vault.lock}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[var(--line)] text-[13px] font-medium text-[var(--ink)] hover:border-[var(--terra)] hover:text-[var(--terra)] transition"
            title="Lock vault"
          >
            <Lock size={14} />
            Lock
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="life-btn life-btn-sm life-btn-primary"
          >
            <Plus size={13} strokeWidth={2} />
            Add item
          </button>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyVault onAdd={() => setCreating(true)} />
      ) : (
        <>
          {/* Search + filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vault…"
                className="w-full rounded-[10px] bg-[var(--paper)] border border-[var(--line)] pl-9 pr-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterPill>
              {typesPresent.map((t) => (
                <FilterPill
                  key={t}
                  active={filter === t}
                  onClick={() => setFilter(t)}
                >
                  {VAULT_TYPE_LABEL[t]}
                </FilterPill>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-[13px] text-[var(--muted)] py-10 text-center">
              Nothing matches.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((entry) => (
                <VaultCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => setEditing(entry)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {(creating || editing) && (
        <ItemModal
          existing={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {settingsOpen && <VaultSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function VaultCard({
  entry,
  onClick,
}: {
  entry: VaultEntry;
  onClick: () => void;
}) {
  const Icon = TYPE_ICON[entry.type];
  const subtitle = subtitleFor(entry);
  const pf = primaryField(entry.type);
  const secret = pf ? entry.data[pf] : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group text-left life-card p-4 hover:border-[var(--terra)]/40 transition relative overflow-hidden cursor-pointer focus:outline-none focus-visible:border-[var(--terra)]"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0"
          style={{
            background: "color-mix(in oklch, var(--terra) 12%, transparent)",
            color: "var(--terra)",
            border: "1px solid color-mix(in oklch, var(--terra) 24%, transparent)",
          }}
        >
          <Icon size={17} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-[var(--ink)] truncate">
            {entry.title || "Untitled"}
          </div>
          <div className="text-[11.5px] text-[var(--muted)] truncate">
            {subtitle ?? VAULT_TYPE_LABEL[entry.type]}
          </div>
        </div>
      </div>
      {secret && (
        <div onClick={(e) => e.stopPropagation()} className="mt-3">
          <SecretReveal value={secret} />
        </div>
      )}
    </div>
  );
}

function SecretReveal({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const multiline = value.includes("\n");
  const display = show
    ? multiline
      ? `${value.split("\n")[0]} +${value.split("\n").filter(Boolean).length - 1}`
      : value
    : "••••••••••••";

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-1.5 rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] pl-2.5 pr-1 py-1">
      <span className="font-mono text-[12.5px] text-[var(--ink-2)] truncate flex-1 tracking-wide">
        {display}
      </span>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--ink)] transition"
        aria-label={show ? "Hide" : "Reveal"}
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button
        type="button"
        onClick={copy}
        className="grid place-items-center w-7 h-7 rounded-md text-[var(--muted-2)] hover:text-[var(--terra)] transition"
        aria-label="Copy"
      >
        {copied ? <Check size={13} className="text-[var(--sage)]" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────

function VaultSettings({ onClose }: { onClose: () => void }) {
  const vault = useVault();
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirmP, setConfirmP] = useState("");
  const [pending, start] = useTransition();
  const strength = passcodeStrength(newP);

  function changePass() {
    if (newP.length < 6) {
      toast.error("New passcode too short");
      return;
    }
    if (newP !== confirmP) {
      toast.error("Passcodes don't match");
      return;
    }
    start(async () => {
      const ok = await vault.changePasscode(oldP, newP);
      if (ok) {
        toast.success("Passcode changed");
        setOldP("");
        setNewP("");
        setConfirmP("");
      } else {
        toast.error("Current passcode is wrong");
      }
    });
  }

  function reset() {
    if (
      !confirm(
        "Reset the vault? This permanently deletes every item and removes your passcode. This cannot be undone.",
      )
    )
      return;
    start(async () => {
      await vault.resetVault();
      toast.success("Vault reset");
      onClose();
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-start justify-center pt-[8vh] pb-8 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 pb-3 flex items-center justify-between border-b border-[var(--line)]">
            <h2 className="text-[15px] font-semibold text-[var(--ink)] inline-flex items-center gap-2">
              <Settings2 size={15} className="text-[var(--terra)]" />
              Vault settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-[8px] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* App lock */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-[var(--ink)]">
                  Lock the whole app
                </div>
                <p className="text-[12.5px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  Require your passcode every time Life OS opens — not just the
                  vault.
                </p>
              </div>
              <Switch
                on={vault.appLockEnabled}
                onChange={(v) => vault.setAppLock(v)}
              />
            </div>

            <div className="border-t border-[var(--line)] pt-5">
              <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3 inline-flex items-center gap-1.5">
                <KeyRound size={12} />
                Change passcode
              </div>
              <div className="space-y-2.5">
                <input
                  type="password"
                  value={oldP}
                  onChange={(e) => setOldP(e.target.value)}
                  placeholder="Current passcode"
                  className={inputCls}
                />
                <input
                  type="password"
                  value={newP}
                  onChange={(e) => setNewP(e.target.value)}
                  placeholder="New passcode"
                  className={inputCls}
                />
                <input
                  type="password"
                  value={confirmP}
                  onChange={(e) => setConfirmP(e.target.value)}
                  placeholder="Confirm new passcode"
                  className={inputCls}
                />
                {newP.length > 0 && (
                  <div className="flex items-center gap-2">
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
                    <span className="text-[11px] text-[var(--muted)] w-16 text-right">
                      {strength.label}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={changePass}
                  disabled={pending || !oldP || !newP}
                  className="life-btn life-btn-sm life-btn-primary w-full justify-center disabled:opacity-40"
                >
                  Update passcode
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--line)] pt-4">
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="text-[12.5px] text-[var(--muted)] hover:text-[var(--bad)] transition"
              >
                Reset vault — delete everything &amp; remove passcode
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function Switch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative w-[44px] h-[26px] rounded-full transition-colors shrink-0"
      style={{ background: on ? "var(--terra)" : "var(--line-2)" }}
    >
      <span
        className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-[left] duration-200"
        style={{ left: on ? 21 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
      />
    </button>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
        active
          ? "bg-[var(--terra)] text-white"
          : "border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--terra)]"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyVault({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--line-2)] py-14 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[56px] h-[56px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Shield size={24} strokeWidth={1.6} />
      </div>
      <div className="text-[18px] font-semibold text-[var(--ink)]">
        Your vault is empty.
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-sm mx-auto leading-relaxed">
        Store logins, cards, recovery codes, and anything else you need kept
        safe. It&apos;s all encrypted with your passcode — on this device only.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 life-btn life-btn-sm life-btn-primary inline-flex"
      >
        <Plus size={13} strokeWidth={2} />
        Add your first item
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition";
