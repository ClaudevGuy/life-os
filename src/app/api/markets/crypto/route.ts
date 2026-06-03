/**
 * Top crypto prices, proxied through our own server (avoids browser CORS and
 * keeps CoinGecko's free endpoint happy). Cached ~30s so a roomful of open
 * tabs doesn't hammer it. No key required, read-only.
 */
const COINS = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "dogecoin",
  "cardano",
  "tron",
];

export const revalidate = 30;

export async function GET() {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS.join(
      ",",
    )}&order=market_cap_desc&price_change_percentage=24h`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      return Response.json({ error: "upstream", status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image: string;
      current_price: number;
      price_change_percentage_24h: number | null;
    }>;
    const byId = new Map(data.map((c) => [c.id, c]));
    const coins = COINS.map((id) => byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        id: c.id,
        symbol: (c.symbol ?? "").toUpperCase(),
        name: c.name,
        image: c.image,
        price: c.current_price,
        change: c.price_change_percentage_24h ?? 0,
      }));
    return Response.json({ coins });
  } catch {
    return Response.json({ error: "fetch_failed" }, { status: 502 });
  }
}
