/**
 * Watch-only EVM wallet balances, priced in USD. A single 0x address is queried
 * on BOTH Ethereum and BNB Chain; the result merges native + curated-token
 * holdings from each, each asset labelled with its chain.
 *
 *   GET /api/wallet/evm?address=0x…
 *   → { address, assets:[{ symbol, amount, price, valueUsd, chain, … }], totalUsd, … }
 *
 * Read-only: we only ever call eth_getBalance and eth_call(balanceOf). Prices
 * come from CoinGecko (same source as the rest of Finance).
 */
import {
  isValidEvmAddress,
  balanceOfData,
  fromRawHex,
  EVM_CHAINS,
  type EvmChainConfig,
} from "@/lib/evm";
import type { WalletAsset, WalletData } from "@/lib/wallet-types";

export const revalidate = 0;

function rpcUrl(chain: EvmChainConfig): string {
  return process.env[chain.rpcEnv] || chain.rpcDefault;
}

/** A single JSON-RPC call returning a hex string result, or null on failure. */
async function jsonRpc(
  url: string,
  method: string,
  params: unknown[],
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { result?: unknown; error?: unknown };
    if (j.error || typeof j.result !== "string") return null;
    return j.result;
  } catch {
    return null;
  }
}

type Priced = { usd: number; change: number | null };

async function nativePrices(): Promise<Record<string, Priced>> {
  const out: Record<string, Priced> = {};
  try {
    const ids = EVM_CHAINS.map((c) => c.nativeCoingeckoId).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { accept: "application/json" }, next: { revalidate: 30 } },
    );
    if (res.ok) {
      const j = (await res.json()) as Record<
        string,
        { usd?: number; usd_24h_change?: number }
      >;
      for (const [id, v] of Object.entries(j)) {
        if (typeof v?.usd === "number") {
          out[id] = {
            usd: v.usd,
            change: typeof v.usd_24h_change === "number" ? v.usd_24h_change : null,
          };
        }
      }
    }
  } catch {
    /* leave unpriced */
  }
  return out;
}

async function tokenPrices(
  platform: string,
  contracts: string[],
): Promise<Map<string, Priced>> {
  const out = new Map<string, Priced>();
  if (contracts.length === 0) return out;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${platform}` +
        `?contract_addresses=${contracts.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { accept: "application/json" }, next: { revalidate: 30 } },
    );
    if (res.ok) {
      const j = (await res.json()) as Record<
        string,
        { usd?: number; usd_24h_change?: number }
      >;
      for (const [k, v] of Object.entries(j)) {
        if (typeof v?.usd === "number") {
          out.set(k.toLowerCase(), {
            usd: v.usd,
            change: typeof v.usd_24h_change === "number" ? v.usd_24h_change : null,
          });
        }
      }
    }
  } catch {
    /* leave unpriced */
  }
  return out;
}

async function scanChain(
  chain: EvmChainConfig,
  address: string,
  nativePx: Record<string, Priced>,
): Promise<{ assets: WalletAsset[]; ok: boolean }> {
  const url = rpcUrl(chain);
  const [nativeHex, tokenHexes, tokenPx] = await Promise.all([
    jsonRpc(url, "eth_getBalance", [address, "latest"]),
    Promise.all(
      chain.tokens.map((t) =>
        jsonRpc(url, "eth_call", [
          { to: t.address, data: balanceOfData(address) },
          "latest",
        ]),
      ),
    ),
    tokenPrices(
      chain.coingeckoPlatform,
      chain.tokens.map((t) => t.address),
    ),
  ]);

  const assets: WalletAsset[] = [];

  // Native coin (ETH / BNB).
  const nativeAmt = nativeHex ? fromRawHex(nativeHex, 18) : 0;
  if (nativeAmt > 0) {
    const np = nativePx[chain.nativeCoingeckoId] ?? null;
    assets.push({
      mint: `${chain.id}:native`,
      symbol: chain.nativeSymbol,
      name: chain.nativeName,
      amount: nativeAmt,
      price: np?.usd ?? null,
      change: np?.change ?? null,
      valueUsd: np?.usd != null ? nativeAmt * np.usd : null,
      logo: null,
      chain: chain.label,
    });
  }

  // Curated ERC-20 / BEP-20 tokens.
  chain.tokens.forEach((t, i) => {
    const hex = tokenHexes[i];
    if (!hex) return;
    const amount = fromRawHex(hex, t.decimals);
    if (amount <= 0) return;
    const p = tokenPx.get(t.address.toLowerCase()) ?? null;
    if (!p) return; // priced curated tokens only
    assets.push({
      mint: `${chain.id}:${t.address}`,
      symbol: t.symbol,
      name: t.symbol,
      amount,
      price: p.usd,
      change: p.change,
      valueUsd: amount * p.usd,
      logo: null,
      chain: chain.label,
    });
  });

  return { assets, ok: nativeHex !== null };
}

export async function GET(req: Request) {
  const address = (new URL(req.url).searchParams.get("address") || "").trim();
  if (!isValidEvmAddress(address)) {
    return Response.json({ error: "invalid_address" }, { status: 400 });
  }

  try {
    const nativePx = await nativePrices();
    const results = await Promise.all(
      EVM_CHAINS.map((c) => scanChain(c, address, nativePx)),
    );

    // If neither chain's RPC responded, surface that as an error rather than
    // silently reporting a $0 balance.
    if (!results.some((r) => r.ok)) {
      return Response.json({ error: "fetch_failed" }, { status: 502 });
    }

    const assets = results
      .flatMap((r) => r.assets)
      .filter((a) => a.amount > 0)
      .sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));
    const totalUsd = assets.reduce((s, a) => s + (a.valueUsd ?? 0), 0);

    const payload: WalletData = {
      address,
      assets,
      hiddenCount: 0,
      totalUsd,
      fetchedAt: new Date().toISOString(),
    };
    return Response.json(payload);
  } catch (e) {
    return Response.json(
      { error: "fetch_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
