/**
 * EVM helpers for watch-only wallet tracking (Ethereum + BNB Smart Chain).
 * Same posture as Solana: read-only, keyless public RPC by default.
 *
 * A single 0x address exists on every EVM chain, so pasting one address tracks
 * the SAME address on BOTH Ethereum and BNB Chain — we sum the native coin plus
 * a curated set of major tokens on each. Full token discovery would need an
 * indexer (Alchemy / Etherscan key); the curated set covers what most people
 * actually hold without a key. Set ETH_RPC_URL / BSC_RPC_URL for a dedicated
 * endpoint if the public ones rate-limit.
 */

export const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_RE.test(address.trim());
}

export type EvmToken = {
  /** Contract address, lowercased. */
  address: string;
  symbol: string;
  decimals: number;
};

export type EvmChainConfig = {
  id: "ethereum" | "bsc";
  label: string;
  rpcEnv: string;
  rpcDefault: string;
  nativeSymbol: string;
  nativeName: string;
  nativeCoingeckoId: string;
  /** CoinGecko asset-platform id for token_price lookups. */
  coingeckoPlatform: string;
  explorer: string;
  tokens: EvmToken[];
};

export const EVM_CHAINS: EvmChainConfig[] = [
  {
    id: "ethereum",
    label: "Ethereum",
    rpcEnv: "ETH_RPC_URL",
    rpcDefault: "https://ethereum-rpc.publicnode.com",
    nativeSymbol: "ETH",
    nativeName: "Ethereum",
    nativeCoingeckoId: "ethereum",
    coingeckoPlatform: "ethereum",
    explorer: "https://etherscan.io/address/",
    tokens: [
      { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", decimals: 6 },
      { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT", decimals: 6 },
      { address: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI", decimals: 18 },
      { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", symbol: "WBTC", decimals: 8 },
      { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "WETH", decimals: 18 },
      { address: "0x514910771af9ca656af840dff83e8264ecf986ca", symbol: "LINK", decimals: 18 },
      { address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", symbol: "UNI", decimals: 18 },
      { address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce", symbol: "SHIB", decimals: 18 },
    ],
  },
  {
    id: "bsc",
    label: "BNB Chain",
    rpcEnv: "BSC_RPC_URL",
    rpcDefault: "https://bsc-dataseed.binance.org",
    nativeSymbol: "BNB",
    nativeName: "BNB",
    nativeCoingeckoId: "binancecoin",
    coingeckoPlatform: "binance-smart-chain",
    explorer: "https://bscscan.com/address/",
    tokens: [
      { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", decimals: 18 },
      { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC", decimals: 18 },
      { address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", symbol: "BUSD", decimals: 18 },
      { address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", symbol: "WBNB", decimals: 18 },
      { address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8", symbol: "ETH", decimals: 18 },
      { address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", symbol: "CAKE", decimals: 18 },
    ],
  },
];

/** ERC-20 `balanceOf(address)` calldata: selector + left-padded address. */
export function balanceOfData(address: string): string {
  const addr = address.toLowerCase().replace(/^0x/, "");
  return `0x70a08231${"0".repeat(24)}${addr}`;
}

/** Hex integer (wei-like) → decimal number, dividing by 10^decimals. */
export function fromRawHex(hex: string, decimals: number): number {
  try {
    const raw = BigInt(hex);
    if (raw === BigInt(0)) return 0;
    const base = BigInt(10) ** BigInt(decimals);
    const whole = raw / base;
    const frac = raw % base;
    return Number(whole) + Number(frac) / Number(base);
  } catch {
    return 0;
  }
}
