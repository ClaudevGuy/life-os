"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock } from "lucide-react";

type RecentEntry = {
  id: string;
  title: string;
  kind: string;
  at: number;
};

const STORAGE_KEY = "lifeos.recent.v1";
const MAX = 8;

function load(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentEntry[];
  } catch {
    return [];
  }
}

function save(list: RecentEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // ignore
  }
}

export function RecentTracker({
  id,
  title,
  kind,
}: {
  id: string;
  title: string | null;
  kind: string;
}) {
  useEffect(() => {
    const list = load();
    const filtered = list.filter((e) => e.id !== id);
    filtered.unshift({
      id,
      title: title ?? "untitled",
      kind,
      at: Date.now(),
    });
    save(filtered);
    // Tell the sidebar widget to refresh
    window.dispatchEvent(new Event("lifeos:recent"));
  }, [id, title, kind]);
  return null;
}

export function RecentlyViewed() {
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    setEntries(load());
    function onRefresh() {
      setEntries(load());
    }
    window.addEventListener("lifeos:recent", onRefresh);
    return () => window.removeEventListener("lifeos:recent", onRefresh);
  }, [pathname]);

  if (entries.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="px-2.5 mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-faint)] inline-flex items-center gap-1.5">
        <Clock size={10} />
        Recently viewed
      </div>
      <div className="space-y-0.5">
        {entries.slice(0, 5).map((e) => (
          <Link
            key={e.id}
            href={`/items/${e.id}`}
            className="flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition truncate"
          >
            <span
              className="w-1 h-1 rounded-full shrink-0"
              style={{ background: `var(--kind-${e.kind})` }}
            />
            <span className="truncate">{e.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
