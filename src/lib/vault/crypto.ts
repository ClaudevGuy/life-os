/**
 * Vault crypto — real encryption at rest via the Web Crypto API.
 *
 * A passcode is never stored. Instead we keep a random salt and a "verifier"
 * (a known token encrypted with the passcode-derived key). To unlock, we derive
 * the key from the entered passcode + salt and try to decrypt the verifier — if
 * it comes back correct, the passcode was right. Each vault item's payload is
 * encrypted with AES-GCM under that same key, so reading IndexedDB directly
 * reveals only ciphertext.
 */

const VERIFY_TOKEN = "lifeos-vault-verify-v1";
const GUARD_KEY = "lifeos.vault.guard";
const APPLOCK_KEY = "lifeos.vault.applock";

export type VaultGuard = { v: 1; salt: string; iv: string; ct: string };

// ── base64 helpers ────────────────────────────────────────────────────────────

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

// ── key derivation + cipher ──────────────────────────────────────────────────

export async function deriveKey(
  passcode: string,
  saltB64: string,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: b64ToBytes(saltB64) as BufferSource,
      iterations: 210_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJSON(
  key: CryptoKey,
  obj: unknown,
): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(obj)),
  );
  return { iv: bufToB64(iv.buffer), ct: bufToB64(ct) };
}

export async function decryptJSON<T = unknown>(
  key: CryptoKey,
  ivB64: string,
  ctB64: string,
): Promise<T> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) as BufferSource },
    key,
    b64ToBytes(ctB64) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

function randomSaltB64(): string {
  return bufToB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

// ── guard (passcode set / verify) ─────────────────────────────────────────────

export function readGuard(): VaultGuard | null {
  try {
    const raw = localStorage.getItem(GUARD_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as VaultGuard;
    if (g && g.salt && g.iv && g.ct) return g;
    return null;
  } catch {
    return null;
  }
}

export function hasGuard(): boolean {
  return readGuard() !== null;
}

/** Create a passcode: returns the derived key and persists the guard. */
export async function createGuard(passcode: string): Promise<CryptoKey> {
  const salt = randomSaltB64();
  const key = await deriveKey(passcode, salt);
  const { iv, ct } = await encryptJSON(key, VERIFY_TOKEN);
  const guard: VaultGuard = { v: 1, salt, iv, ct };
  localStorage.setItem(GUARD_KEY, JSON.stringify(guard));
  return key;
}

/** Verify a passcode against the stored guard. Returns the key or null. */
export async function verifyPasscode(passcode: string): Promise<CryptoKey | null> {
  const guard = readGuard();
  if (!guard) return null;
  try {
    const key = await deriveKey(passcode, guard.salt);
    const token = await decryptJSON<string>(key, guard.iv, guard.ct);
    return token === VERIFY_TOKEN ? key : null;
  } catch {
    return null;
  }
}

/** Replace the guard for a new passcode (used when changing it). */
export async function replaceGuard(newPasscode: string): Promise<CryptoKey> {
  return createGuard(newPasscode);
}

export function clearGuard(): void {
  try {
    localStorage.removeItem(GUARD_KEY);
  } catch {
    /* ignore */
  }
}

// ── app-lock flag ──────────────────────────────────────────────────────────────

export function readAppLock(): boolean {
  try {
    return localStorage.getItem(APPLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAppLock(enabled: boolean): void {
  try {
    localStorage.setItem(APPLOCK_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
