/**
 * Solana helpers shared by the wallet-tracking server route and the Finance UI.
 * Pure + isomorphic (no DOM, no Node) so it imports cleanly on both sides.
 *
 * "Watch-only" is the whole posture here: we identify a wallet by its public
 * address and only ever READ from it. Nothing in this app signs a transaction.
 */

/**
 * Base58 public key, 32–44 chars. Base58 deliberately omits 0 O I l, so this
 * also rejects the most common copy-paste typos. The RPC is the final arbiter —
 * this is just a fast client-side guard before we bother the network.
 */
export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_RE.test(address.trim());
}

/** "7xKX…9aQp" — a compact, copy-safe rendering of a long address. */
export function truncateAddress(address: string, lead = 4, tail = 4): string {
  const a = address.trim();
  if (a.length <= lead + tail + 1) return a;
  return `${a.slice(0, lead)}…${a.slice(-tail)}`;
}

/** One holding inside a tracked wallet, already priced in USD. */
export type WalletAsset = {
  /** SPL mint address, or "native" for SOL itself. */
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;
  price: number | null;
  /** 24h price change %, when the price source provides it. */
  change: number | null;
  valueUsd: number | null;
  logo: string | null;
};

/** The priced snapshot of a wallet returned by /api/wallet/solana. */
export type WalletData = {
  address: string;
  assets: WalletAsset[];
  /** Count of held tokens we couldn't price (kept out of the total). */
  hiddenCount: number;
  totalUsd: number;
  fetchedAt: string;
};
