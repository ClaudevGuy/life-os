/**
 * On-demand quotes for an arbitrary set of holdings. Powers live valuation on
 * the Finance page. Read-only, server-side (no browser CORS, no keys).
 *
 *   GET /api/markets/quote?coins=bitcoin,solana&stocks=AAPL,TSLA
 *   → { crypto: { bitcoin: {price, change} }, stocks: { AAPL: {price, change, currency} } }
 *
 * `coins` are CoinGecko ids; `stocks` are ticker symbols.
 */
export const revalidate = 30;

type StockQuote = { price: number; change: number; currency: string } | null;

async function yahooQuote(sym: string): Promise<StockQuote> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        sym,
      )}?range=1d&interval=1d`,
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          accept: "application/json",
        },
        next: { revalidate: 30 },
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            currency?: string;
          };
        }>;
      };
    };
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    const prev =
      meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
    const change = prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
    return {
      price: meta.regularMarketPrice,
      change,
      currency: meta.currency ?? "USD",
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const coins = (params.get("coins") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const stocks = (params.get("stocks") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const crypto: Record<string, { price: number; change: number }> = {};
  const stockOut: Record<string, { price: number; change: number; currency: string }> = {};

  await Promise.all([
    (async () => {
      if (coins.length === 0) return;
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(
            ",",
          )}&vs_currencies=usd&include_24hr_change=true`,
          { headers: { accept: "application/json" }, next: { revalidate: 30 } },
        );
        if (res.ok) {
          const j = (await res.json()) as Record<
            string,
            { usd?: number; usd_24h_change?: number }
          >;
          for (const id of coins) {
            const row = j[id];
            if (row && typeof row.usd === "number") {
              crypto[id] = { price: row.usd, change: row.usd_24h_change ?? 0 };
            }
          }
        }
      } catch {
        /* leave crypto partial */
      }
    })(),
    (async () => {
      await Promise.all(
        stocks.map(async (sym) => {
          const q = await yahooQuote(sym);
          if (q) stockOut[sym] = q;
        }),
      );
    })(),
  ]);

  return Response.json({ crypto, stocks: stockOut });
}
