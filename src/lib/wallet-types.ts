/**
 * Shared shapes for watch-only wallet tracking, across every chain (Solana,
 * Ethereum, BNB Chain). Neutral + isomorphic — imported by both the API routes
 * and the Finance UI.
 */

/** One holding inside a tracked wallet, already priced in USD. */
export type WalletAsset = {
  /** Stable id: an SPL mint, an EVM `chain:contract`, or `chain:native`. */
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;
  price: number | null;
  /** 24h price change %, when the price source provides it. */
  change: number | null;
  valueUsd: number | null;
  logo: string | null;
  /** Human chain label ("Ethereum", "BNB Chain") — set for multi-chain wallets. */
  chain?: string;
};

/** The priced snapshot of a wallet returned by /api/wallet/[chain]. */
export type WalletData = {
  address: string;
  assets: WalletAsset[];
  /** Count of held tokens we couldn't price (kept out of the total). */
  hiddenCount: number;
  totalUsd: number;
  fetchedAt: string;
};

/** "7xKX…9aQp" — a compact, copy-safe rendering of a long address. */
export function truncateAddress(address: string, lead = 4, tail = 4): string {
  const a = address.trim();
  if (a.length <= lead + tail + 1) return a;
  return `${a.slice(0, lead)}…${a.slice(-tail)}`;
}
