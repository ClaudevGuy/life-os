/**
 * Top stock prices, fetched server-side from Yahoo Finance's public chart
 * endpoint (no key required). We hit it from our own server so there's no
 * browser CORS and the request comes from the user's own machine. This is an
 * unofficial endpoint — best-effort, read-only; if Yahoo ever changes it we
 * can swap in a keyed provider (Finnhub, etc.).
 */
const STOCKS: { sym: string; name: string }[] = [
  { sym: "AAPL", name: "Apple" },
  { sym: "MSFT", name: "Microsoft" },
  { sym: "NVDA", name: "Nvidia" },
  { sym: "GOOGL", name: "Alphabet" },
  { sym: "AMZN", name: "Amazon" },
  { sym: "TSLA", name: "Tesla" },
  { sym: "META", name: "Meta" },
];

export const revalidate = 30;

type Quote = { price: number; prevClose: number; currency: string } | null;

async function quote(sym: string): Promise<Quote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      sym,
    )}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        // Yahoo 403s requests without a browser-ish UA.
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "application/json",
      },
      next: { revalidate: 30 },
    });
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
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
    return {
      price: meta.regularMarketPrice,
      prevClose: prev,
      currency: meta.currency ?? "USD",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const stocks = await Promise.all(
    STOCKS.map(async (s) => {
      const q = await quote(s.sym);
      if (!q) return null;
      const change = q.prevClose ? ((q.price - q.prevClose) / q.prevClose) * 100 : 0;
      return {
        symbol: s.sym,
        name: s.name,
        price: q.price,
        change,
        currency: q.currency,
      };
    }),
  );
  return Response.json({ stocks: stocks.filter(Boolean) });
}
