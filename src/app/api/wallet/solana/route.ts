/**
 * Watch-only Solana wallet balances, priced in USD.
 *
 *   GET /api/wallet/solana?address=<base58>
 *   → { address, assets:[{ mint, symbol, name, amount, price, change, valueUsd, logo }],
 *       hiddenCount, totalUsd, fetchedAt }
 *
 * Runs server-side so the browser never deals with RPC CORS or any keys, and so
 * the only calls we ever make are READS — getBalance and getTokenAccountsByOwner.
 * Nothing here signs anything.
 *
 * Prices come from CoinGecko (the same source the rest of Finance uses). Token
 * names + logos are best-effort from Jupiter's token list; if that's down the
 * value is still correct, just labelled by a short mint stub.
 *
 * Set SOLANA_RPC_URL to a dedicated endpoint (Helius, QuickNode, Triton…) for
 * reliability — the default public mainnet-beta RPC is heavily rate-limited.
 */
import {
  isValidSolanaAddress,
  type WalletAsset,
  type WalletData,
} from "@/lib/solana";

export const revalidate = 0;

const RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const LAMPORTS_PER_SOL = 1_000_000_000;

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`rpc ${method} ${res.status}`);
  const j = (await res.json()) as {
    result?: unknown;
    error?: { message?: string };
  };
  if (j.error) throw new Error(j.error.message || `rpc ${method} error`);
  return j.result;
}

type ParsedTokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          mint?: string;
          tokenAmount?: { uiAmount?: number | null; decimals?: number };
        };
      };
    };
  };
};

/** Sum fungible balances by mint, skipping zero balances and likely NFTs. */
function collectBalances(value: unknown): Map<string, number> {
  const out = new Map<string, number>();
  const list = Array.isArray(value) ? (value as ParsedTokenAccount[]) : [];
  for (const acc of list) {
    const info = acc?.account?.data?.parsed?.info;
    const mint = info?.mint;
    const amt = info?.tokenAmount?.uiAmount;
    const decimals = info?.tokenAmount?.decimals;
    if (!mint || typeof amt !== "number" || amt <= 0) continue;
    if (decimals === 0 && amt === 1) continue; // 1-of-1, 0 decimals → NFT
    out.set(mint, (out.get(mint) ?? 0) + amt);
  }
  return out;
}

type Priced = { usd: number; change: number | null };

// CoinGecko caps URL length and rate, so price in bounded batches. A genuine
// wallet holds a handful of tokens; a watch-only address can accrete thousands
// of dust accounts — we price up to MAX_PRICED of them and leave the rest out.
const PRICE_BATCH = 50;
const MAX_PRICED = 100;

async function priceBatch(mints: string[]): Promise<Map<string, Priced>> {
  const out = new Map<string, Priced>();
  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/token_price/solana` +
      `?contract_addresses=${mints.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const j = (await res.json()) as Record<
        string,
        { usd?: number; usd_24h_change?: number }
      >;
      for (const [k, v] of Object.entries(j)) {
        if (typeof v?.usd === "number") {
          const priced: Priced = {
            usd: v.usd,
            change: typeof v.usd_24h_change === "number" ? v.usd_24h_change : null,
          };
          out.set(k, priced);
          out.set(k.toLowerCase(), priced); // case-insensitive alias
        }
      }
    }
  } catch {
    /* leave this batch unpriced */
  }
  return out;
}

async function tokenPrices(mints: string[]): Promise<Map<string, Priced>> {
  const out = new Map<string, Priced>();
  const capped = mints.slice(0, MAX_PRICED);
  const batches: string[][] = [];
  for (let i = 0; i < capped.length; i += PRICE_BATCH) {
    batches.push(capped.slice(i, i + PRICE_BATCH));
  }
  const results = await Promise.all(batches.map(priceBatch));
  for (const m of results) for (const [k, v] of m) out.set(k, v);
  return out;
}

async function solPrice(): Promise<Priced | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
      { headers: { accept: "application/json" }, next: { revalidate: 30 } },
    );
    if (res.ok) {
      const j = (await res.json()) as {
        solana?: { usd?: number; usd_24h_change?: number };
      };
      const s = j.solana;
      if (s && typeof s.usd === "number") {
        return {
          usd: s.usd,
          change: typeof s.usd_24h_change === "number" ? s.usd_24h_change : null,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

type JupMeta = { symbol: string; name: string; logoURI: string | null };

async function jupMeta(mint: string): Promise<JupMeta | null> {
  try {
    const res = await fetch(`https://tokens.jup.ag/token/${mint}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (res.ok) {
      const j = (await res.json()) as {
        symbol?: string;
        name?: string;
        logoURI?: string;
      };
      if (j?.symbol) {
        return {
          symbol: j.symbol,
          name: j.name || j.symbol,
          logoURI: j.logoURI ?? null,
        };
      }
    }
  } catch {
    /* no metadata — value still correct */
  }
  return null;
}

export async function GET(req: Request) {
  const address = (new URL(req.url).searchParams.get("address") || "").trim();
  if (!isValidSolanaAddress(address)) {
    return Response.json({ error: "invalid_address" }, { status: 400 });
  }

  try {
    const [balResult, ta1, ta2] = await Promise.all([
      rpc("getBalance", [address]),
      rpc("getTokenAccountsByOwner", [
        address,
        { programId: TOKEN_PROGRAM },
        { encoding: "jsonParsed" },
      ]),
      rpc("getTokenAccountsByOwner", [
        address,
        { programId: TOKEN_2022_PROGRAM },
        { encoding: "jsonParsed" },
      ]).catch(() => ({ value: [] })),
    ]);

    const lamports = (balResult as { value?: number } | null)?.value ?? 0;
    const sol = lamports / LAMPORTS_PER_SOL;

    const balances = collectBalances((ta1 as { value?: unknown })?.value);
    for (const [m, a] of collectBalances((ta2 as { value?: unknown })?.value)) {
      balances.set(m, (balances.get(m) ?? 0) + a);
    }
    const mints = [...balances.keys()];

    const [prices, sp] = await Promise.all([tokenPrices(mints), solPrice()]);

    // Only priced tokens are shown; fetch names/logos just for those (capped).
    const priceOf = (m: string) => prices.get(m) ?? prices.get(m.toLowerCase());
    const pricedMints = mints.filter((m) => priceOf(m));
    const metas = await Promise.all(
      pricedMints.slice(0, 40).map((m) => jupMeta(m)),
    );
    const metaByMint = new Map<string, JupMeta | null>(
      pricedMints.map((m, i) => [m, metas[i] ?? null]),
    );

    const list: WalletAsset[] = [];

    // Native SOL is always shown, even if its price momentarily fails.
    list.push({
      mint: "native",
      symbol: "SOL",
      name: "Solana",
      amount: sol,
      price: sp?.usd ?? null,
      change: sp?.change ?? null,
      valueUsd: sp?.usd != null ? sol * sp.usd : null,
      logo: null,
    });

    for (const mint of pricedMints) {
      const amount = balances.get(mint) ?? 0;
      const p = priceOf(mint)!;
      const meta = metaByMint.get(mint) ?? null;
      list.push({
        mint,
        symbol: meta?.symbol ?? `${mint.slice(0, 4)}…`,
        name: meta?.name ?? null,
        amount,
        price: p.usd,
        change: p.change,
        valueUsd: amount * p.usd,
        logo: meta?.logoURI ?? null,
      });
    }

    // Held tokens we couldn't price are summarised, not listed.
    const hiddenCount = mints.length - pricedMints.length;

    // Sort by value desc but keep SOL pinned at the top.
    const [solAsset, ...rest] = list;
    rest.sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));
    const assets = [solAsset, ...rest];
    const totalUsd = assets.reduce((s, a) => s + (a.valueUsd ?? 0), 0);

    const payload: WalletData = {
      address,
      assets,
      hiddenCount,
      totalUsd,
      fetchedAt: new Date().toISOString(),
    };
    return Response.json(payload);
  } catch (e) {
    return Response.json(
      {
        error: "fetch_failed",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
