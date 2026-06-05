"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/store/db";
import {
  createGuard,
  verifyPasscode,
  hasGuard,
  encryptJSON,
  decryptJSON,
  readAppLock,
  writeAppLock,
  clearGuard,
} from "@/lib/vault/crypto";
import type { VaultEntry, VaultType } from "@/lib/vault/types";
import {
  type AiCreds,
  getCreds,
  setCreds,
  isAiKeyVaultLocked,
  hydrateAiKeyFromVault,
  dropAiKeyRuntime,
  writeSecuredCreds,
  revertToPlaintext,
  reencryptSecured,
  clearSecured,
} from "@/lib/ai-key";

type VaultCtx = {
  ready: boolean;
  hasPasscode: boolean;
  unlocked: boolean;
  appLockEnabled: boolean;
  appLocked: boolean;
  items: VaultEntry[] | null;
  setup: (pass: string) => Promise<boolean>;
  unlock: (pass: string) => Promise<boolean>;
  lock: () => void;
  changePasscode: (oldP: string, newP: string) => Promise<boolean>;
  resetVault: () => Promise<void>;
  setAppLock: (on: boolean) => void;
  /** Whether the AI API key is encrypted under the vault passcode. */
  aiKeyLocked: boolean;
  /** Encrypt the saved AI key under the vault (requires the vault unlocked). */
  secureAiKey: () => Promise<boolean>;
  /** Move the AI key back to plaintext storage (requires the vault unlocked). */
  unsecureAiKey: () => Promise<boolean>;
  /** Save new AI creds while in locked mode (re-encrypts under the vault). */
  saveSecuredAiCreds: (creds: AiCreds) => Promise<boolean>;
  /** Forget the AI key everywhere (plaintext + sealed). */
  forgetAiKey: () => void;
  addItem: (
    type: VaultType,
    title: string,
    data: Record<string, string>,
  ) => Promise<void>;
  editItem: (
    id: string,
    title: string,
    data: Record<string, string>,
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
};

const Ctx = createContext<VaultCtx | null>(null);

export function useVault(): VaultCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useVault must be used within VaultProvider");
  return c;
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [items, setItems] = useState<VaultEntry[] | null>(null);
  const [aiKeyLocked, setAiKeyLocked] = useState(false);

  useEffect(() => {
    setHasPasscode(hasGuard());
    setAppLockEnabled(readAppLock());
    setAiKeyLocked(isAiKeyVaultLocked());
    setReady(true);
  }, []);

  const rows = useLiveQuery(() =>
    db.vault.orderBy("updatedAt").reverse().toArray(),
  );

  // Decrypt whenever unlocked + rows change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!key || !rows) {
        setItems(key ? [] : null);
        return;
      }
      const out: VaultEntry[] = [];
      for (const r of rows) {
        try {
          const payload = await decryptJSON<{
            title: string;
            data: Record<string, string>;
          }>(key, r.iv, r.ct);
          out.push({
            id: r.id,
            type: r.type as VaultType,
            title: payload.title ?? "",
            data: payload.data ?? {},
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          });
        } catch {
          /* skip entries we can't decrypt */
        }
      }
      if (!cancelled) setItems(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, rows]);

  const unlock = useCallback(async (pass: string) => {
    const k = await verifyPasscode(pass);
    if (!k) return false;
    await hydrateAiKeyFromVault(k); // decrypt the sealed AI key into memory
    setKey(k);
    setSessionUnlocked(true);
    return true;
  }, []);

  const setup = useCallback(async (pass: string) => {
    const k = await createGuard(pass);
    await hydrateAiKeyFromVault(k);
    setKey(k);
    setHasPasscode(true);
    setSessionUnlocked(true);
    return true;
  }, []);

  const lock = useCallback(() => {
    setKey(null);
    setSessionUnlocked(false);
    setItems(null);
    dropAiKeyRuntime(); // forget the in-memory AI key
  }, []);

  const setAppLock = useCallback((on: boolean) => {
    writeAppLock(on);
    setAppLockEnabled(on);
  }, []);

  const changePasscode = useCallback(async (oldP: string, newP: string) => {
    const oldKey = await verifyPasscode(oldP);
    if (!oldKey) return false;
    const newKey = await createGuard(newP);
    const all = await db.vault.toArray();
    for (const r of all) {
      try {
        const payload = await decryptJSON(oldKey, r.iv, r.ct);
        const { iv, ct } = await encryptJSON(newKey, payload);
        await db.vault.update(r.id, { iv, ct, updatedAt: new Date() });
      } catch {
        /* leave entries we can't re-encrypt */
      }
    }
    await reencryptSecured(oldKey, newKey); // keep the sealed AI key in sync
    setKey(newKey);
    setSessionUnlocked(true);
    return true;
  }, []);

  const resetVault = useCallback(async () => {
    await db.vault.clear();
    clearGuard();
    writeAppLock(false);
    clearSecured(); // the sealed AI key is unrecoverable without the passcode
    setKey(null);
    setItems(null);
    setHasPasscode(false);
    setSessionUnlocked(false);
    setAppLockEnabled(false);
    setAiKeyLocked(false);
  }, []);

  const addItem = useCallback(
    async (type: VaultType, title: string, data: Record<string, string>) => {
      if (!key) return;
      const { iv, ct } = await encryptJSON(key, { title, data });
      const now = new Date();
      await db.vault.add({
        id: crypto.randomUUID(),
        type,
        iv,
        ct,
        createdAt: now,
        updatedAt: now,
      });
    },
    [key],
  );

  const editItem = useCallback(
    async (id: string, title: string, data: Record<string, string>) => {
      if (!key) return;
      const { iv, ct } = await encryptJSON(key, { title, data });
      await db.vault.update(id, { iv, ct, updatedAt: new Date() });
    },
    [key],
  );

  const removeItem = useCallback(async (id: string) => {
    await db.vault.delete(id);
  }, []);

  // ── AI key under the vault ──────────────────────────────────────────────
  const secureAiKey = useCallback(async () => {
    if (!key) return false;
    const creds = getCreds();
    if (!creds) return false;
    const ok = await writeSecuredCreds(key, creds);
    if (ok) setAiKeyLocked(true);
    return ok;
  }, [key]);

  const unsecureAiKey = useCallback(async () => {
    if (!key) return false;
    const ok = await revertToPlaintext(key);
    if (ok) setAiKeyLocked(false);
    return ok;
  }, [key]);

  const saveSecuredAiCreds = useCallback(
    async (creds: AiCreds) => {
      if (!key) return false;
      const ok = await writeSecuredCreds(key, creds);
      if (ok) setAiKeyLocked(true);
      return ok;
    },
    [key],
  );

  const forgetAiKey = useCallback(() => {
    setCreds(null);
    clearSecured();
    setAiKeyLocked(false);
  }, []);

  const appLocked = ready && appLockEnabled && hasPasscode && !sessionUnlocked;

  const value = useMemo<VaultCtx>(
    () => ({
      ready,
      hasPasscode,
      unlocked: key !== null,
      appLockEnabled,
      appLocked,
      items,
      setup,
      unlock,
      lock,
      changePasscode,
      resetVault,
      setAppLock,
      aiKeyLocked,
      secureAiKey,
      unsecureAiKey,
      saveSecuredAiCreds,
      forgetAiKey,
      addItem,
      editItem,
      removeItem,
    }),
    [
      ready,
      hasPasscode,
      key,
      appLockEnabled,
      appLocked,
      items,
      setup,
      unlock,
      lock,
      changePasscode,
      resetVault,
      setAppLock,
      aiKeyLocked,
      secureAiKey,
      unsecureAiKey,
      saveSecuredAiCreds,
      forgetAiKey,
      addItem,
      editItem,
      removeItem,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
