"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useItemsOfKind, type StoredItem } from "@/lib/store/items";
import { Users, Bell, Clock } from "lucide-react";
import { NewPersonButton } from "./new-person";

const STUDIO_PALETTE = [
  "var(--terra)",
  "var(--sage)",
  "var(--gold)",
  "var(--plum)",
  "var(--sky)",
];
const STUDIO_TINTS: Record<string, string> = {
  "var(--terra)": "var(--terra-tint)",
  "var(--sage)": "var(--sage-tint)",
  "var(--gold)": "var(--gold-tint)",
  "var(--plum)": "var(--plum-tint)",
  "var(--sky)": "var(--sky-tint)",
};

// 14 days w/o contact ⇒ surface in "Needs a reply". Tunable.
const REPLY_THRESHOLD_DAYS = 14;

function personColor(p: StoredItem): string {
  const m = (p.metadata ?? {}) as { color?: string };
  if (m.color && STUDIO_PALETTE.includes(m.color)) return m.color;
  const seed = p.title ?? p.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return STUDIO_PALETTE[Math.abs(hash) % STUDIO_PALETTE.length];
}

function lastContact(p: StoredItem): Date | null {
  const m = (p.metadata ?? {}) as { lastContactedAt?: string };
  return m.lastContactedAt ? new Date(m.lastContactedAt) : null;
}

function relationship(p: StoredItem): string | null {
  const m = (p.metadata ?? {}) as { relationship?: string };
  return m.relationship?.trim() || null;
}

function initials(name: string | null): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function needsReply(p: StoredItem): boolean {
  const last = lastContact(p);
  if (!last) return true;
  const days = (Date.now() - last.getTime()) / 86_400_000;
  return days >= REPLY_THRESHOLD_DAYS;
}

export default function PeoplePage() {
  const rows = (useItemsOfKind("person") ?? []) as StoredItem[];

  const { needsReplyRows, everyone } = useMemo(() => {
    const a: StoredItem[] = [];
    const b: StoredItem[] = [];
    for (const p of rows) {
      if (needsReply(p)) a.push(p);
      else b.push(p);
    }
    a.sort((x, y) => {
      const lx = lastContact(x)?.getTime() ?? 0;
      const ly = lastContact(y)?.getTime() ?? 0;
      return lx - ly;
    });
    b.sort((x, y) => {
      const lx = lastContact(x)?.getTime() ?? 0;
      const ly = lastContact(y)?.getTime() ?? 0;
      return ly - lx;
    });
    return { needsReplyRows: a, everyone: b };
  }, [rows]);

  return (
    <div className="p-8 max-w-7xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Users
              size={20}
              strokeWidth={1.6}
              className="text-[var(--terra)]"
            />
            People
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            The people you care about, with rhythm.
          </p>
        </div>
        <NewPersonButton />
      </header>

      {rows.length === 0 ? (
        <EmptyHero />
      ) : (
        <>
          {needsReplyRows.length > 0 && (
            <section className="mb-10">
              <h2 className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--terra)] mb-3">
                <Bell size={11} strokeWidth={1.6} />
                Needs a reply
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 life-stagger">
                {needsReplyRows.map((p) => (
                  <PersonCard key={p.id} person={p} accent />
                ))}
              </div>
            </section>
          )}

          {everyone.length > 0 && (
            <section>
              <h2 className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-3">
                Everyone · {everyone.length}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 life-stagger">
                {everyone.map((p) => (
                  <PersonCard key={p.id} person={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PersonCard({
  person: p,
  accent,
}: {
  person: StoredItem;
  accent?: boolean;
}) {
  const color = personColor(p);
  const tint = STUDIO_TINTS[color] ?? "var(--paper-2)";
  const rel = relationship(p);
  const last = lastContact(p);
  const name = p.title?.trim() || "Untitled";

  return (
    <Link
      href={`/items/${p.id}`}
      className="group life-card life-card-hover py-6 px-5 flex flex-col items-center text-center min-h-[224px]"
    >
      <div
        className="grid place-items-center w-[68px] h-[68px] rounded-full text-[18px] font-semibold tracking-[-0.01em] mb-4"
        style={{
          background: tint,
          color,
          border: `1.6px solid ${color}`,
        }}
      >
        {initials(p.title)}
      </div>
      <div className="text-[16px] font-semibold tracking-[-0.015em] text-[var(--ink)] line-clamp-1">
        {name}
      </div>
      {rel && (
        <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          {rel}
        </div>
      )}
      <div className="mt-auto pt-4">
        {last ? (
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
            style={{
              color: accent ? "var(--terra)" : "var(--muted)",
            }}
          >
            <Clock size={12} strokeWidth={1.6} />
            last {formatRel(last)} ago
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-medium"
            style={{ color: accent ? "var(--terra)" : "var(--muted-2)" }}
          >
            <Clock size={12} strokeWidth={1.6} />
            no contact logged
          </span>
        )}
      </div>
    </Link>
  );
}

function EmptyHero() {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Users size={22} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-medium text-[var(--ink)]">
        Your relationships, remembered.
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        Add anyone you talk to often — friends, mentors, recruiters, family.
        Track when you last spoke and what you discussed.
      </p>
    </div>
  );
}

function formatRel(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}
