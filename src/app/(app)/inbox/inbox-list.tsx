"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, ExternalLink, Sparkles, Archive, Trash2 } from "lucide-react";
import type { Item } from "@/db/schema";
import { FilterChips } from "./filter-chips";

type Kind = "all" | "bookmark" | "note" | "task" | "idea" | "highlight";

export function InboxList({ rows }: { rows: Item[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Kind>("all");
  const [pending, startTransition] = useTransition();
  const [localPins, setLocalPins] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = rows.filter((r) => !hidden.has(r.id));
  const filtered =
    filter === "all" ? visible : visible.filter((r) => r.kind === filter);

  async function togglePin(id: string, isPinned: boolean) {
    setLocalPins((s) => ({ ...s, [id]: !isPinned }));
    startTransition(async () => {
      await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned }),
      });
      toast.success(!isPinned ? "Pinned" : "Unpinned");
      router.refresh();
    });
  }

  function archive(id: string) {
    setHidden((s) => new Set(s).add(id));
    startTransition(async () => {
      await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      toast.success("Archived");
      router.refresh();
    });
  }

  function del(id: string) {
    if (!confirm("Delete this item? This can't be undone.")) return;
    setHidden((s) => new Set(s).add(id));
    startTransition(async () => {
      await fetch(`/api/items/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mt-6">
        <FilterChips onChange={setFilter} />
      </div>
      <ul className="mt-4 space-y-1.5 life-stagger">
        {filtered.length === 0 && (
          <li className="life-card p-6 text-center text-sm text-[var(--text-faint)]">
            Nothing in this filter.
          </li>
        )}
        {filtered.map((it) => {
          const pinned = localPins[it.id] ?? it.isPinned;
          return (
            <li
              key={it.id}
              className="life-card life-card-hover transition group relative"
            >
              <Link
                href={`/items/${it.id}`}
                className="flex items-start gap-3 p-3.5"
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: `var(--kind-${it.kind})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--text)] truncate">
                      {it.title ?? (
                        <em className="text-[var(--text-faint)]">untitled</em>
                      )}
                    </span>
                    {pinned && (
                      <Pin
                        size={11}
                        className="text-[var(--accent)] fill-[var(--accent)]"
                      />
                    )}
                    {!it.summary && (
                      <span
                        title="Pending enrichment"
                        className="text-[var(--text-faint)]"
                      >
                        <Sparkles size={11} />
                      </span>
                    )}
                  </div>
                  {it.summary && (
                    <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2 pr-24">
                      {it.summary}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-faint)]">
                    <span className="uppercase tracking-wide">{it.kind}</span>
                    {it.topic && <span>· #{it.topic}</span>}
                    {it.sourceUrl && (
                      <span className="inline-flex items-center gap-1 truncate max-w-xs">
                        ·{" "}
                        <ExternalLink size={10} />
                        {new URL(it.sourceUrl).hostname.replace(/^www\./, "")}
                      </span>
                    )}
                    <span className="ml-auto pr-24">{formatRel(it.capturedAt)}</span>
                  </div>
                </div>
              </Link>

              {/* Hover actions — pin / archive / delete */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition pointer-events-none group-hover:pointer-events-auto">
                <ActionBtn
                  onClick={() => togglePin(it.id, pinned)}
                  disabled={pending}
                  label={pinned ? "Unpin" : "Pin"}
                  icon={Pin}
                  active={pinned}
                />
                <ActionBtn
                  onClick={() => archive(it.id)}
                  disabled={pending}
                  label="Archive"
                  icon={Archive}
                />
                <ActionBtn
                  onClick={() => del(it.id)}
                  disabled={pending}
                  label="Delete"
                  icon={Trash2}
                  danger
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  label,
  icon: Icon,
  active,
  danger,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid place-items-center w-7 h-7 rounded-md border transition disabled:opacity-50 ${
        active
          ? "bg-[var(--accent-soft)] border-[var(--accent-soft)] text-[var(--accent)]"
          : danger
          ? "bg-[var(--bg-card)] border-[var(--border-soft)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
          : "bg-[var(--bg-card)] border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
      }`}
    >
      <Icon size={12} className={active && label.startsWith("Unpin") ? "fill-current" : ""} />
    </button>
  );
}

function formatRel(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
