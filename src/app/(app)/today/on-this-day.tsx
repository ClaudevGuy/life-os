import type { StoredItem as Item } from "@/lib/store/items";
import Link from "next/link";
import { History } from "lucide-react";

export function OnThisDay({ items }: { items: Item[] }) {
  // Items from the same calendar day in previous months/years
  const today = new Date();
  const matches = items.filter((i) => {
    const d = new Date(i.capturedAt);
    if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
      return false;
    return d.getDate() === today.getDate();
  });

  if (matches.length === 0) return null;

  const tint = "var(--kind-bookmark)";
  return (
    <div className="life-card p-4 relative overflow-hidden">
      <div
        className="absolute -top-px left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${tint}, transparent)` }}
      />
      <h2 className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
        <History size={11} style={{ color: tint }} />
        On this day
      </h2>
      <ul className="space-y-2">
        {matches.slice(0, 4).map((m) => (
          <li key={m.id}>
            <Link
              href={`/items/${m.id}`}
              className="flex items-start gap-2 hover:text-[var(--accent)] transition"
            >
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: `var(--kind-${m.kind})` }}
              />
              <div className="min-w-0">
                <div className="text-sm text-[var(--text)] truncate">
                  {m.title ?? "untitled"}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-faint)]">
                  {monthsAgo(new Date(m.capturedAt), today)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function monthsAgo(then: Date, now: Date) {
  const months =
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth());
  if (months <= 0) return "earlier today";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
