/**
 * Solana address helpers for watch-only wallet tracking. "Watch-only" is the
 * whole posture: we identify a wallet by its public address and only ever READ.
 * Nothing in this app signs a transaction.
 */

export {
  truncateAddress,
  type WalletAsset,
  type WalletData,
} from "@/lib/wallet-types";

/**
 * Base58 public key, 32–44 chars. Base58 deliberately omits 0 O I l, so this
 * also rejects the most common copy-paste typos. The RPC is the final arbiter —
 * this is just a fast client-side guard before we bother the network.
 */
export const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_RE.test(address.trim());
}
