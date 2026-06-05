/**
 * US Dollar Index (DXY) — the dollar's strength vs a basket of major
 * currencies. Pulled from Yahoo's chart endpoint server-side (no key, no
 * browser CORS). Returns the current level, the day's change, the change over
 * the requested range, and the historical close points for a chart.
 *
 *   GET /api/markets/usd?range=3mo  → { price, change, rangeChange, points[] }
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// range → sensible candle interval (keeps the point count reasonable)
const INTERVAL: Record<string, string> = {
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y": "1wk",
};

export const revalidate = 300;

export async function GET(req: Request) {
  const rangeParam = new URL(req.url).searchParams.get("range") || "3mo";
  const range = INTERVAL[rangeParam] ? rangeParam : "3mo";
  const interval = INTERVAL[range];
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?range=${range}&interval=${interval}`,
      {
        headers: { "user-agent": UA, accept: "application/json" },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) {
      return Response.json({ error: "upstream", status: res.status }, { status: 502 });
    }
    const j = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
          indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>;
      };
    };
    const result = j?.chart?.result?.[0];
    const meta = result?.meta;
    const points = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (x): x is number => typeof x === "number",
    );
    if (!meta || points.length === 0) {
      return Response.json({ error: "no_data" }, { status: 502 });
    }
    const price = meta.regularMarketPrice ?? points[points.length - 1];
    const prev = meta.chartPreviousClose ?? points[points.length - 2] ?? price;
    const first = points[0] ?? price;
    const change = prev ? ((price - prev) / prev) * 100 : 0;
    const rangeChange = first ? ((price - first) / first) * 100 : 0;
    return Response.json({ price, change, rangeChange, range, points });
  } catch {
    return Response.json({ error: "fetch_failed" }, { status: 502 });
  }
}
