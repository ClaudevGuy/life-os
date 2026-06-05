/**
 * Client-side AI credentials. Stored in localStorage so they persist across
 * sessions. Credentials never leave the browser except as headers on
 * `/api/ai/*` requests to the user's own deployment.
 *
 * Supported providers:
 *
 *   - "anthropic" — direct via @ai-sdk/anthropic. Get a key at
 *     console.anthropic.com.
 *   - "openai"    — direct via @ai-sdk/openai. Get a key at
 *     platform.openai.com/api-keys.
 *
 * To add another provider (Google, Mistral, etc.), install its
 * @ai-sdk/<provider> package, add the literal to AiProvider, add a case
 * in ai-provider.ts's buildModel, and a meta entry in ai-key-section.tsx.
 */
"use client";

import { encryptJSON, decryptJSON } from "@/lib/vault/crypto";

export type AiProvider = "anthropic" | "openai";

export type AiCreds = {
  provider: AiProvider;
  key: string;
  /** Optional model override. Empty/undefined → server default per provider. */
  model?: string;
};

const STORAGE_KEY = "lifeos.ai-key";

function read(): AiCreds | null {
  if (typeof window === "undefined") return null;
  // Vault-locked mode: the key is encrypted at rest and only exists in memory
  // (`runtime`) while the vault is unlocked this session. No plaintext to read.
  if (readEnc()) return runtime;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // New JSON shape
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as Partial<AiCreds>;
      if (
        parsed &&
        typeof parsed.key === "string" &&
        (parsed.provider === "anthropic" || parsed.provider === "openai")
      ) {
        return {
          provider: parsed.provider,
          key: parsed.key,
          model:
            typeof parsed.model === "string" && parsed.model.trim()
              ? parsed.model.trim()
              : undefined,
        };
      }
      return null;
    }
    // Legacy: plain string = treat as Anthropic key (pre-multi-provider).
    return { provider: "anthropic", key: raw };
  } catch {
    return null;
  }
}

function write(creds: AiCreds | null): void {
  if (typeof window === "undefined") return;
  try {
    if (creds && creds.key.trim()) {
      const clean: AiCreds = {
        provider: creds.provider,
        key: creds.key.trim(),
        ...(creds.model?.trim() ? { model: creds.model.trim() } : {}),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* quota / disabled storage — silently ignore */
  }
}

export function getCreds(): AiCreds | null {
  return read();
}
export function setCreds(creds: AiCreds | null): void {
  write(creds);
}

/* ───────────────────────────────────────────────────────────────────────────
 * Vault-locked mode
 *
 * When enabled, the API key is encrypted (AES-GCM) under the user's *vault*
 * key — the same one derived from the Vault passcode — and stored as ciphertext
 * in `lifeos.ai-key.enc`. The plaintext key is removed. The decrypted key lives
 * only in `runtime` (memory) while the vault is unlocked, so on reload/lock the
 * key is unreadable until the vault is unlocked again. Provider/model are kept
 * in cleartext (not secret) so the UI can show them while sealed.
 *
 * All functions here take the vault CryptoKey; VaultProvider owns it and wraps
 * these so the key itself never leaks into the component tree.
 * ─────────────────────────────────────────────────────────────────────────── */

const ENC_KEY = "lifeos.ai-key.enc";

type EncBlob = {
  v: 1;
  provider: AiProvider;
  model?: string;
  iv: string;
  ct: string;
};

/** Decrypted creds, in memory only while the vault is unlocked this session. */
let runtime: AiCreds | null = null;

function readEnc(): EncBlob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ENC_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as EncBlob;
    if (
      b &&
      b.v === 1 &&
      typeof b.iv === "string" &&
      typeof b.ct === "string" &&
      (b.provider === "anthropic" || b.provider === "openai")
    ) {
      return b;
    }
    return null;
  } catch {
    return null;
  }
}

export type AiKeyState = "none" | "ready" | "sealed";

/** Whether the AI key is stored encrypted under the vault. */
export function isAiKeyVaultLocked(): boolean {
  return readEnc() !== null;
}

/** "ready" = usable now · "sealed" = vault-locked but vault is locked · "none". */
export function aiKeyState(): AiKeyState {
  if (readEnc()) return runtime ? "ready" : "sealed";
  return read() ? "ready" : "none";
}

/** Cleartext provider/model — readable even while sealed (for the UI). */
export function getVaultLockMeta(): { provider: AiProvider; model?: string } | null {
  const b = readEnc();
  return b ? { provider: b.provider, ...(b.model ? { model: b.model } : {}) } : null;
}

/** Decrypt the sealed key into memory. Called by VaultProvider on unlock. */
export async function hydrateAiKeyFromVault(vaultKey: CryptoKey): Promise<boolean> {
  const b = readEnc();
  if (!b) return false;
  try {
    const key = await decryptJSON<string>(vaultKey, b.iv, b.ct);
    runtime = { provider: b.provider, key, ...(b.model ? { model: b.model } : {}) };
    return true;
  } catch {
    return false;
  }
}

/** Forget the in-memory key. Called by VaultProvider on lock. */
export function dropAiKeyRuntime(): void {
  runtime = null;
}

/** Encrypt `creds` under the vault key and enter (or update) locked mode. */
export async function writeSecuredCreds(
  vaultKey: CryptoKey,
  creds: AiCreds,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const clean: AiCreds = {
    provider: creds.provider,
    key: creds.key.trim(),
    ...(creds.model?.trim() ? { model: creds.model.trim() } : {}),
  };
  if (!clean.key) return false;
  try {
    const { iv, ct } = await encryptJSON(vaultKey, clean.key);
    const blob: EncBlob = {
      v: 1,
      provider: clean.provider,
      ...(clean.model ? { model: clean.model } : {}),
      iv,
      ct,
    };
    window.localStorage.setItem(ENC_KEY, JSON.stringify(blob));
    window.localStorage.removeItem(STORAGE_KEY); // drop the plaintext copy
    runtime = clean;
    return true;
  } catch {
    return false;
  }
}

/** Decrypt the sealed key back into plaintext storage (leave locked mode). */
export async function revertToPlaintext(vaultKey: CryptoKey): Promise<boolean> {
  const b = readEnc();
  if (!b) return true;
  try {
    const key = await decryptJSON<string>(vaultKey, b.iv, b.ct);
    write({ provider: b.provider, key, ...(b.model ? { model: b.model } : {}) });
    window.localStorage.removeItem(ENC_KEY);
    runtime = null;
    return true;
  } catch {
    return false;
  }
}

/** Re-encrypt the sealed key under a new vault key (on passcode change). */
export async function reencryptSecured(
  oldKey: CryptoKey,
  newKey: CryptoKey,
): Promise<void> {
  const b = readEnc();
  if (!b) return;
  try {
    const key = await decryptJSON<string>(oldKey, b.iv, b.ct);
    const { iv, ct } = await encryptJSON(newKey, key);
    window.localStorage.setItem(ENC_KEY, JSON.stringify({ ...b, iv, ct }));
  } catch {
    /* leave as-is if the old key can't decrypt it */
  }
}

/** Forget the sealed key entirely (on vault reset — it becomes unrecoverable). */
export function clearSecured(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ENC_KEY);
  } catch {
    /* ignore */
  }
  runtime = null;
}

/** Build headers for a fetch to /api/ai/*. */
export function aiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const creds = read();
  if (creds) {
    headers.Authorization = `Bearer ${creds.key}`;
    headers["x-ai-provider"] = creds.provider;
    if (creds.model) headers["x-ai-model"] = creds.model;
  }
  return headers;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Legacy named exports — kept so any caller still using the old single-key
 * API doesn't break. Treat as Anthropic-only.
 * ─────────────────────────────────────────────────────────────────────── */
export function getAiKey(): string | null {
  return read()?.key ?? null;
}
export function setAiKey(key: string | null): void {
  write(key ? { provider: "anthropic", key } : null);
}
