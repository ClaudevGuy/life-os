"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  Loader2,
  X,
  Sparkles,
  Lock,
  LockKeyhole,
  Unlock,
} from "lucide-react";
import {
  getCreds,
  setCreds,
  getVaultLockMeta,
  type AiCreds,
  type AiProvider,
} from "@/lib/ai-key";
import { useVault } from "@/components/vault/vault-provider";

type Status = "idle" | "saving" | "testing" | "ok" | "bad";

type ProviderMeta = {
  label: string;
  placeholder: string;
  defaultModel: string;
  helpHref: string;
  helpHost: string;
  blurb: string;
};

const PROVIDERS: Record<AiProvider, ProviderMeta> = {
  anthropic: {
    label: "Anthropic",
    placeholder: "sk-ant-…",
    defaultModel: "claude-haiku-4-5",
    helpHref: "https://console.anthropic.com/settings/keys",
    helpHost: "console.anthropic.com",
    blurb: "Direct Claude access. Cheap, fast, good at long documents.",
  },
  openai: {
    label: "OpenAI",
    placeholder: "sk-proj-…",
    defaultModel: "gpt-4o-mini",
    helpHref: "https://platform.openai.com/api-keys",
    helpHost: "platform.openai.com",
    blurb: "Direct OpenAI access. Great general-purpose.",
  },
};

const ORDER: AiProvider[] = ["anthropic", "openai"];

export function AiKeySection() {
  const vault = useVault();
  const [saved, setSaved] = useState<AiCreds | null>(null);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [keyDraft, setKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [unlockDraft, setUnlockDraft] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  // The key is sealed: encrypted under the vault but the vault isn't unlocked.
  const sealed = vault.aiKeyLocked && !vault.unlocked;
  const lockMeta = vault.aiKeyLocked ? getVaultLockMeta() : null;

  // Hydrate from storage; re-read when the vault unlocks or lock-mode changes.
  useEffect(() => {
    const c = getCreds();
    setSaved(c);
    setReveal(false); // never leave a key revealed across a lock-state change
    setReplacing(false);
    if (c) {
      setProvider(c.provider);
      setModelDraft(c.model ?? "");
    } else {
      const m = getVaultLockMeta();
      if (m) {
        setProvider(m.provider);
        setModelDraft(m.model ?? "");
      }
    }
  }, [vault.unlocked, vault.aiKeyLocked]);

  const meta = PROVIDERS[provider];
  const editing = !saved || saved.provider !== provider;

  /** Persist creds — re-encrypts under the vault when in locked mode. */
  async function persist(next: AiCreds) {
    if (vault.aiKeyLocked) await vault.saveSecuredAiCreds(next);
    else setCreds(next);
  }

  async function save() {
    const key = keyDraft.trim();
    if (!key) {
      toast.error("Paste a key first");
      return;
    }
    setStatus("saving");
    const next: AiCreds = {
      provider,
      key,
      ...(modelDraft.trim() ? { model: modelDraft.trim() } : {}),
    };
    await persist(next);
    setSaved(next);
    setKeyDraft("");
    setReplacing(false);
    setReveal(false);
    setStatus("idle");
    toast.success(
      vault.aiKeyLocked
        ? "Saved — locked under your vault"
        : "AI credentials saved locally",
    );
  }

  async function updateModel(next: string) {
    setModelDraft(next);
    if (saved && !editing) {
      const merged: AiCreds = {
        provider: saved.provider,
        key: saved.key,
        ...(next.trim() ? { model: next.trim() } : {}),
      };
      await persist(merged);
      setSaved(merged);
    }
  }

  function clear() {
    if (
      !confirm(
        "Forget this AI key? Brief and Ask will stop working until you paste another one.",
      )
    )
      return;
    vault.forgetAiKey();
    setSaved(null);
    setKeyDraft("");
    setModelDraft("");
    setStatus("idle");
    toast.success("Cleared");
  }

  async function test() {
    setStatus("testing");
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (saved) {
      headers.Authorization = `Bearer ${saved.key}`;
      headers["x-ai-provider"] = saved.provider;
      if (saved.model) headers["x-ai-model"] = saved.model;
    }
    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers,
        body: JSON.stringify({
          recent: [
            {
              kind: "note",
              title: "test",
              summary: "Reply with a single word: working",
            },
          ],
        }),
      });
      if (!res.ok) {
        setStatus("bad");
        const data = (await res.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(data?.detail ?? "AI call failed");
        return;
      }
      setStatus("ok");
      toast.success("AI is reachable");
    } catch {
      setStatus("bad");
      toast.error("Couldn't reach the AI proxy");
    }
  }

  async function toggleLock() {
    if (!vault.hasPasscode) {
      toast.error("Set a vault passcode first");
      return;
    }
    if (!vault.unlocked) {
      toast.error("Unlock your vault first");
      return;
    }
    if (vault.aiKeyLocked) {
      const ok = await vault.unsecureAiKey();
      if (ok) toast.success("Unlocked — key stored in plaintext again");
      else toast.error("Couldn't unlock the key");
    } else {
      if (!saved) {
        toast.error("Save a key first");
        return;
      }
      const ok = await vault.secureAiKey();
      if (ok) toast.success("Locked under your vault");
      else toast.error("Couldn't lock the key");
    }
  }

  async function doUnlock() {
    if (!unlockDraft) return;
    setUnlocking(true);
    const ok = await vault.unlock(unlockDraft);
    setUnlocking(false);
    if (ok) {
      setUnlockDraft("");
      toast.success("Vault unlocked");
    } else {
      toast.error("Wrong passcode");
    }
  }

  /** Re-seal: lock the vault so the key is encrypted-at-rest again. */
  function lockNow() {
    vault.lock();
    toast.success("Vault locked");
  }

  /** Stop encrypting under the vault — store the key in plaintext again. */
  async function removeVaultLock() {
    const ok = await vault.unsecureAiKey();
    if (ok) toast.success("Vault lock removed — key stored in plaintext");
    else toast.error("Couldn't remove the lock");
  }

  const masked = saved
    ? `${saved.key.slice(0, 6)}…${saved.key.slice(-4)}`
    : null;

  return (
    <div className="life-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
          style={{ background: "var(--terra-tint)", color: "var(--terra)" }}
        >
          <Key size={15} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--ink)]">
            AI credentials
          </div>
          <p className="text-[12.5px] text-[var(--muted)] mt-0.5 leading-relaxed">
            Required for the Brief on{" "}
            <code className="font-mono text-[var(--terra)]">/today</code> and the
            chat on <code className="font-mono text-[var(--terra)]">/ask</code>.
            Stored in this browser only.
          </p>
        </div>
        {vault.aiKeyLocked && (
          <span
            className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-semibold shrink-0"
            style={{ background: "var(--terra-tint)", color: "var(--terra)" }}
            title="Encrypted under your vault passcode"
          >
            <Lock size={11} /> Vault-locked
          </span>
        )}
      </div>

      {sealed ? (
        /* Sealed: encrypted at rest, vault not unlocked this session */
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)] p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--ink)]">
            <LockKeyhole size={15} className="text-[var(--terra)]" />
            Your AI key is locked
          </div>
          <p className="mt-1 text-[12.5px] text-[var(--muted)] leading-relaxed">
            It&apos;s encrypted under your vault passcode. Unlock your vault below
            to use AI and view or change the key.
          </p>
          {lockMeta && (
            <div className="mt-3 flex items-center gap-2 text-[12px]">
              <span className="px-2 py-0.5 rounded-full bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-2)]">
                {PROVIDERS[lockMeta.provider].label}
              </span>
              <span className="font-mono text-[var(--muted-2)]">
                {lockMeta.model ?? PROVIDERS[lockMeta.provider].defaultModel}
              </span>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Provider picker */}
          <label className="block text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
            Provider
          </label>
          <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] mb-3">
            {ORDER.map((p) => {
              const active = provider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setProvider(p);
                    if (saved?.provider !== p) {
                      setKeyDraft("");
                      setModelDraft("");
                    }
                  }}
                  className={`px-3 py-1.5 rounded-[7px] text-[12.5px] font-medium transition ${
                    active
                      ? "bg-[var(--paper)] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                  style={active ? { boxShadow: "var(--shadow-1)" } : undefined}
                >
                  {PROVIDERS[p].label}
                </button>
              );
            })}
          </div>

          <p className="text-[12px] text-[var(--muted)] mb-4 leading-relaxed">
            {meta.blurb}{" "}
            <a
              href={meta.helpHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--terra)] hover:underline"
            >
              Get one at {meta.helpHost} →
            </a>
          </p>

          {/* Key field */}
          <label className="block text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
            API key
          </label>
          {saved && !editing && !replacing ? (
            vault.aiKeyLocked ? (
              /* Vault unlocked this session: viewable (eye) but only replaceable. */
              <div className="flex items-center gap-2 mb-3">
                <code className="font-mono text-[12px] text-[var(--muted)] bg-[var(--paper-2)] border border-[var(--line)] rounded-[10px] px-3 py-2 flex-1 inline-flex items-center gap-2 min-w-0">
                  <Lock size={12} className="text-[var(--terra)] shrink-0" />
                  <span className="truncate">{reveal ? saved.key : masked}</span>
                </code>
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="grid place-items-center w-9 h-9 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
                  aria-label={reveal ? "Hide" : "Reveal"}
                >
                  {reveal ? (
                    <EyeOff size={14} strokeWidth={1.6} />
                  ) : (
                    <Eye size={14} strokeWidth={1.6} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKeyDraft("");
                    setReplacing(true);
                  }}
                  className="h-9 px-3 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
                  title="Replace the key"
                >
                  Replace
                </button>
              </div>
            ) : (
              /* Plaintext: masked with reveal */
              <div className="flex items-center gap-2 mb-3">
                <code className="font-mono text-[12px] text-[var(--muted)] bg-[var(--paper-2)] border border-[var(--line)] rounded-[10px] px-3 py-2 flex-1">
                  {reveal ? saved.key : masked}
                </code>
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="grid place-items-center w-9 h-9 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
                  aria-label={reveal ? "Hide" : "Reveal"}
                >
                  {reveal ? (
                    <EyeOff size={14} strokeWidth={1.6} />
                  ) : (
                    <Eye size={14} strokeWidth={1.6} />
                  )}
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 mb-3">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder={replacing ? "Paste a new key…" : meta.placeholder}
                autoFocus={replacing}
                className="flex-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                autoComplete="off"
                spellCheck={false}
              />
              {replacing && (
                <button
                  type="button"
                  onClick={() => {
                    setReplacing(false);
                    setKeyDraft("");
                  }}
                  className="h-9 px-3 rounded-[8px] text-[12px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Model override */}
          <label className="block text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
            Model{" "}
            <span className="opacity-60 normal-case tracking-normal font-normal">
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={modelDraft}
            onChange={(e) => updateModel(e.target.value)}
            placeholder={meta.defaultModel}
            className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-[11px] text-[var(--muted-2)]">
            Leave empty to use the default ({meta.defaultModel}).
          </p>

          {/* Actions */}
          <div className="mt-5 flex items-center gap-2">
            {saved ? (
              <>
                <button
                  type="button"
                  onClick={test}
                  disabled={status === "testing"}
                  className="life-btn life-btn-sm life-btn-secondary"
                >
                  {status === "testing" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : status === "ok" ? (
                    <Check size={12} className="text-[var(--sage)]" />
                  ) : status === "bad" ? (
                    <X size={12} className="text-[var(--bad)]" />
                  ) : (
                    <Sparkles size={12} strokeWidth={1.6} />
                  )}
                  Test
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="life-btn life-btn-sm life-btn-ghost"
                >
                  Clear
                </button>
                <div className="ml-auto">
                  {editing || replacing ? (
                    <button
                      type="button"
                      onClick={save}
                      disabled={!keyDraft.trim() || status === "saving"}
                      className="life-btn life-btn-sm life-btn-primary"
                    >
                      {editing ? `Save as ${meta.label}` : "Save key"}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--muted)]">
                      {vault.aiKeyLocked && (
                        <Lock size={11} className="text-[var(--terra)]" />
                      )}
                      Stored as {PROVIDERS[saved.provider].label}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={save}
                disabled={!keyDraft.trim() || status === "saving"}
                className="life-btn life-btn-sm life-btn-primary ml-auto"
              >
                Save
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Vault lock ───────────────────────────────────────────────────── */}
      {vault.ready && (
        <div className="mt-5 pt-4 border-t border-[var(--line)]">
          {!vault.hasPasscode ? (
            <div className="flex items-start gap-2.5">
              <Lock
                size={14}
                className="text-[var(--muted-2)] mt-0.5 shrink-0"
              />
              <p className="text-[12.5px] text-[var(--muted)] leading-relaxed">
                Want this key locked behind a passcode? Set up a{" "}
                <Link
                  href="/vault"
                  className="text-[var(--terra)] hover:underline"
                >
                  Vault passcode
                </Link>{" "}
                first, then come back to enable it.
              </p>
            </div>
          ) : !vault.unlocked ? (
            <div>
              <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink)]">
                <Lock size={14} className="text-[var(--terra)]" />
                {vault.aiKeyLocked
                  ? "Unlock your vault to use AI"
                  : "Unlock your vault to lock this key"}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="password"
                  value={unlockDraft}
                  onChange={(e) => setUnlockDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doUnlock()}
                  placeholder="Vault passcode"
                  className="flex-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={doUnlock}
                  disabled={unlocking || !unlockDraft}
                  className="life-btn life-btn-sm life-btn-primary"
                >
                  {unlocking ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Unlock"
                  )}
                </button>
              </div>
              {sealed && (
                <button
                  type="button"
                  onClick={clear}
                  className="mt-2 text-[11.5px] text-[var(--muted)] hover:text-[var(--bad)] transition"
                >
                  Forget this key instead
                </button>
              )}
            </div>
          ) : vault.aiKeyLocked ? (
            /* Locked mode, vault unlocked this session — offer to re-seal. */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-[var(--ink)] inline-flex items-center gap-1.5">
                    <Unlock size={14} className="text-[var(--sage)]" />
                    Vault unlocked this session
                  </div>
                  <p className="text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed">
                    Your AI key is decrypted in memory. Lock to seal it until you
                    next unlock.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={lockNow}
                  className="life-btn life-btn-sm life-btn-secondary shrink-0"
                >
                  <Lock size={13} strokeWidth={1.7} />
                  Lock now
                </button>
              </div>
              <button
                type="button"
                onClick={removeVaultLock}
                className="text-[11.5px] text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                Remove vault lock — store the key in plaintext instead
              </button>
            </div>
          ) : (
            /* Plaintext, vault unlocked — offer to lock. */
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[var(--ink)] inline-flex items-center gap-1.5">
                  <Lock size={13} className="text-[var(--terra)]" />
                  Lock under vault password
                </div>
                <p className="text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  Encrypt the key so it&apos;s unreadable until you unlock your
                  vault.
                </p>
              </div>
              <Switch checked={false} disabled={!saved} onChange={toggleLock} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="relative w-[44px] h-[26px] rounded-full transition-colors shrink-0 disabled:opacity-40"
      style={{ background: checked ? "var(--accent)" : "var(--border-strong)" }}
    >
      <span
        className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-[left] duration-200"
        style={{ left: checked ? 21 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}
      />
    </button>
  );
}
