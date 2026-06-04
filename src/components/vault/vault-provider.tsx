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

  useEffect(() => {
    setHasPasscode(hasGuard());
    setAppLockEnabled(readAppLock());
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
    setKey(k);
    setSessionUnlocked(true);
    return true;
  }, []);

  const setup = useCallback(async (pass: string) => {
    const k = await createGuard(pass);
    setKey(k);
    setHasPasscode(true);
    setSessionUnlocked(true);
    return true;
  }, []);

  const lock = useCallback(() => {
    setKey(null);
    setSessionUnlocked(false);
    setItems(null);
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
    setKey(newKey);
    setSessionUnlocked(true);
    return true;
  }, []);

  const resetVault = useCallback(async () => {
    await db.vault.clear();
    clearGuard();
    writeAppLock(false);
    setKey(null);
    setItems(null);
    setHasPasscode(false);
    setSessionUnlocked(false);
    setAppLockEnabled(false);
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
      addItem,
      editItem,
      removeItem,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
