"use client";

import { useItemsOfKind } from "@/lib/store/items";
import Link from "next/link";
import { NewPersonButton } from "./new-person";
import { BlobImg } from "@/components/blob-img";

export default function PeoplePage() {
  const rows = useItemsOfKind("person") ?? [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">People</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Conversations, last contacted, and what was discussed.
          </p>
        </div>
        <NewPersonButton />
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 text-sm text-zinc-600">
          No people yet. Add someone you talk to often.
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 life-stagger">
          {rows.map((p) => {
            const meta = (p.metadata ?? {}) as {
              handle?: string;
              lastContactedAt?: string;
              photos?: string[];
            };
            const avatar = meta.photos?.[0];
            const initials = (p.title ?? "?")
              .split(" ")
              .map((s) => s[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <li key={p.id} className="life-card life-card-hover transition">
                <Link href={`/items/${p.id}`} className="flex gap-3 p-3.5">
                  {avatar ? (
                    <BlobImg
                      id={avatar}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--border-soft)]"
                    />
                  ) : (
                    <div
                      className="grid place-items-center w-10 h-10 rounded-full shrink-0 text-[11px] font-semibold text-[var(--text-muted)] border border-[var(--border-soft)] bg-[var(--bg-rail)]"
                      style={{
                        background: `color-mix(in oklch, var(--kind-person) 12%, var(--bg-card))`,
                        color: "var(--kind-person)",
                      }}
                    >
                      {initials || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-medium truncate">
                        {p.title ?? "untitled"}
                      </div>
                      {meta.handle && (
                        <div className="text-xs text-[var(--text-faint)] truncate">
                          {meta.handle}
                        </div>
                      )}
                    </div>
                    {p.summary && (
                      <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">
                        {p.summary}
                      </p>
                    )}
                    <div className="mt-1.5 text-[11px] text-[var(--text-faint)]">
                      {meta.lastContactedAt
                        ? `last spoke ${formatRel(new Date(meta.lastContactedAt))}`
                        : "no contact logged"}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRel(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
