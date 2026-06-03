/**
 * Foreign-exchange rates, proxied from frankfurter.app (free, no key, ECB
 * reference rates). Lets the Finance page express a mixed-currency net worth in
 * a single base currency. Cached ~1h since reference rates move slowly.
 *
 * Response: { base, date, rates: { EUR: 0.86, ILS: 2.86, ... } }
 * where each rate is "units of that currency per 1 unit of base".
 */
const SUPPORTED = ["USD", "EUR", "GBP", "ILS", "JPY", "CHF", "CAD", "AUD"];

export const revalidate = 3600;

export async function GET(req: Request) {
  const base = (new URL(req.url).searchParams.get("base") || "USD").toUpperCase();
  const from = SUPPORTED.includes(base) ? base : "USD";
  const to = SUPPORTED.filter((c) => c !== from).join(",");
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      { headers: { accept: "application/json" }, next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      return Response.json({ error: "upstream", status: res.status }, { status: 502 });
    }
    const j = (await res.json()) as {
      base?: string;
      date?: string;
      rates?: Record<string, number>;
    };
    const rates = { ...(j.rates ?? {}), [from]: 1 };
    return Response.json({ base: from, date: j.date ?? null, rates });
  } catch {
    return Response.json({ error: "fetch_failed" }, { status: 502 });
  }
}
