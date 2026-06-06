"use client";

/**
 * Tracked on-chain wallets — a Finance setting, not a first-class item kind.
 * They live in the appKV table under a single key, so adding wallet tracking
 * doesn't ripple through inbox / search / graph / etc. Watch-only: we keep an
 * address and a label, never a key.
 */
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { nanoid } from "nanoid";
import { db } from "@/lib/store/db";
import type { WalletData } from "@/lib/wallet-types";
import { isValidSolanaAddress } from "@/lib/solana";
import { isValidEvmAddress } from "@/lib/evm";

const KEY = "finance.wallets";

export type WalletChain = "solana" | "evm";

/** Infer which chain an address belongs to from its shape (0x… → EVM). */
export function detectChain(address: string): WalletChain | null {
  const a = address.trim();
  if (isValidEvmAddress(a)) return "evm";
  if (isValidSolanaAddress(a)) return "solana";
  return null;
}

export type TrackedWallet = {
  id: string;
  chain: WalletChain;
  address: string;
  label?: string;
  addedAt: string;
};

async function readWallets(): Promise<TrackedWallet[]> {
  const row = await db.appKV.get(KEY);
  return Array.isArray(row?.value) ? (row.value as TrackedWallet[]) : [];
}

async function writeWallets(list: TrackedWallet[]): Promise<void> {
  await db.appKV.put({ key: KEY, value: list });
}

/** Live list of tracked wallets (undefined until the first read resolves). */
export function useWallets(): TrackedWallet[] | undefined {
  return useLiveQuery(() => readWallets(), []);
}

/** Add a wallet. Returns null if the address is already tracked. */
export async function addWallet(input: {
  chain: WalletChain;
  address: string;
  label?: string;
}): Promise<TrackedWallet | null> {
  const list = await readWallets();
  const address = input.address.trim();
  if (list.some((w) => w.address === address)) return null;
  const wallet: TrackedWallet = {
    id: nanoid(),
    chain: input.chain,
    address,
    label: input.label?.trim() || undefined,
    addedAt: new Date().toISOString(),
  };
  await writeWallets([...list, wallet]);
  return wallet;
}

export async function removeWallet(id: string): Promise<void> {
  const list = await readWallets();
  await writeWallets(list.filter((w) => w.id !== id));
}

export async function renameWallet(id: string, label: string): Promise<void> {
  const list = await readWallets();
  const trimmed = label.trim();
  await writeWallets(
    list.map((w) =>
      w.id === id ? { ...w, label: trimmed || undefined } : w,
    ),
  );
}

// ── Live balances ────────────────────────────────────────────────────────────

export type WalletState = {
  loading: boolean;
  error: string | null;
  data: WalletData | null;
};

/**
 * Fetch + keep fresh the priced balances for each tracked wallet, keyed by
 * wallet id. Re-runs when the wallet set changes or `nonce` is bumped (manual
 * refresh), and polls every 90s. Prior data is preserved across refreshes so
 * the UI doesn't flash empty.
 */
export function useWalletBalances(
  wallets: TrackedWallet[],
  nonce: number,
): Record<string, WalletState> {
  const [states, setStates] = useState<Record<string, WalletState>>({});
  const key = wallets.map((w) => `${w.id}:${w.chain}:${w.address}`).join("|");

  useEffect(() => {
    if (wallets.length === 0) {
      setStates({});
      return;
    }
    const ctrl = new AbortController();
    let active = true;

    // Seed loading state for new wallets; drop any that were removed.
    setStates((prev) => {
      const next: Record<string, WalletState> = {};
      for (const w of wallets) {
        next[w.id] = prev[w.id] ?? { loading: true, error: null, data: null };
      }
      return next;
    });

    const loadOne = async (w: TrackedWallet) => {
      try {
        setStates((prev) => ({
          ...prev,
          [w.id]: {
            loading: true,
            error: null,
            data: prev[w.id]?.data ?? null,
          },
        }));
        const r = await fetch(
          `/api/wallet/${w.chain}?address=${encodeURIComponent(w.address)}`,
          { signal: ctrl.signal, cache: "no-store" },
        );
        const j = (await r.json()) as WalletData & { error?: string };
        if (!active) return;
        if (!r.ok || j.error) {
          setStates((prev) => ({
            ...prev,
            [w.id]: {
              loading: false,
              error: j.error || "fetch_failed",
              data: prev[w.id]?.data ?? null,
            },
          }));
        } else {
          setStates((prev) => ({
            ...prev,
            [w.id]: { loading: false, error: null, data: j },
          }));
        }
      } catch (e) {
        if ((e as Error)?.name === "AbortError" || !active) return;
        setStates((prev) => ({
          ...prev,
          [w.id]: {
            loading: false,
            error: "fetch_failed",
            data: prev[w.id]?.data ?? null,
          },
        }));
      }
    };

    wallets.forEach(loadOne);
    const t = setInterval(() => wallets.forEach(loadOne), 90_000);
    return () => {
      active = false;
      ctrl.abort();
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  return states;
}
