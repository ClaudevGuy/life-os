"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  Plus,
  ExternalLink,
  Pencil,
  Tag,
} from "lucide-react";
import {
  useItemsOfKind,
  captureItem,
  type StoredItem,
} from "@/lib/store/items";
import {
  detectPlatform,
  normalizeUrl,
  platformInitial,
  relDate,
} from "@/lib/bookmarks";
import { EditBookmarkModal } from "./edit-bookmark";

type DerivedBookmark = {
  item: StoredItem;
  url: string;
  title: string;
  description: string | null;
  platform: string;
  host: string;
  color: string;
  tags: string[];
};

function derive(item: StoredItem): DerivedBookmark | null {
  const m = (item.metadata ?? {}) as {
    url?: string;
    platform?: string;
    host?: string;
    color?: string;
    tags?: string[];
  };
  const url = m.url ?? item.sourceUrl ?? "";
  if (!url) return null;
  // Always re-detect from URL so older bookmarks pick up new platform
  // mappings without needing a migration.
  const detected = detectPlatform(url);
  return {
    item,
    url,
    title: item.title?.trim() || detected.host || "Untitled",
    description: item.body?.trim() || null,
    platform: m.platform || detected.name,
    host: m.host || detected.host,
    color: m.color || detected.color,
    tags: m.tags ?? [],
  };
}

export default function BookmarksPage() {
  const rows = (useItemsOfKind("bookmark") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const bookmarks = useMemo(
    () =>
      rows
        .filter((r) => r.status !== "archived")
        .map(derive)
        .filter((x): x is DerivedBookmark => x !== null),
    [rows],
  );

  // Group by platform, ordered by count desc (most-used first).
  const groups = useMemo(() => {
    const m = new Map<string, DerivedBookmark[]>();
    for (const b of bookmarks) {
      const arr = m.get(b.platform) ?? [];
      arr.push(b);
      m.set(b.platform, arr);
    }
    return [...m.entries()]
      .map(([name, items]) => ({
        name,
        items: items.sort(
          (a, b) =>
            new Date(b.item.capturedAt).getTime() -
            new Date(a.item.capturedAt).getTime(),
        ),
        color: items[0].color,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [bookmarks]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86_400_000;
    const thisWeek = bookmarks.filter(
      (b) => new Date(b.item.capturedAt).getTime() >= weekAgo,
    ).length;
    return {
      total: bookmarks.length,
      thisWeek,
      platforms: groups.length,
      topPlatform: groups[0]?.name ?? "—",
      topPlatformColor: groups[0]?.color ?? "var(--muted)",
      topPlatformCount: groups[0]?.items.length ?? 0,
    };
  }, [bookmarks, groups]);

  const visibleGroups = useMemo(() => {
    if (filter === "all") return groups;
    return groups.filter((g) => g.name === filter);
  }, [groups, filter]);

  return (
    <div className="p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6">
        <h1 className="life-h1 inline-flex items-center gap-2">
          <Bookmark
            size={20}
            strokeWidth={1.6}
            className="text-[var(--terra)]"
          />
          Bookmarks
        </h1>
        <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
          Links worth coming back to, organized by where they live.
        </p>
      </header>

      <AddBar />

      {bookmarks.length === 0 ? (
        <EmptyHero />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger mb-6">
            <Stat label="Total" value={stats.total} tone="ink" />
            <Stat label="This week" value={stats.thisWeek} tone="terra" />
            <Stat label="Platforms" value={stats.platforms} tone="ink" />
            <Stat
              label="Top platform"
              value={stats.topPlatform}
              hint={`${stats.topPlatformCount} saved`}
              tone="custom"
              color={stats.topPlatformColor}
            />
          </div>

          {/* Filter chips */}
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6 life-stagger">
              <FilterChip
                label="All"
                count={bookmarks.length}
                color="var(--ink)"
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              {groups.map((g) => (
                <FilterChip
                  key={g.name}
                  label={g.name}
                  count={g.items.length}
                  color={g.color}
                  active={filter === g.name}
                  onClick={() => setFilter(g.name)}
                />
              ))}
            </div>
          )}

          {/* Groups */}
          <div className="space-y-10">
            {visibleGroups.map((g) => (
              <section key={g.name}>
                <header className="flex items-center gap-3 mb-3">
                  <div
                    className="grid place-items-center w-8 h-8 rounded-[9px] text-[13px] font-semibold tracking-[-0.01em] shrink-0"
                    style={{
                      background: `color-mix(in oklch, ${g.color} 16%, transparent)`,
                      color: g.color,
                      border: `1px solid color-mix(in oklch, ${g.color} 30%, transparent)`,
                    }}
                  >
                    {platformInitial(g.name)}
                  </div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
                    {g.name}
                  </h2>
                  <span
                    aria-hidden
                    className="flex-1 h-px"
                    style={{ background: "var(--line)" }}
                  />
                  <span className="font-mono text-[11.5px] text-[var(--muted)] tabular-nums">
                    {g.items.length}
                  </span>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.items.map((b) => (
                    <BookmarkCard
                      key={b.item.id}
                      bookmark={b}
                      onEdit={() => setEditing(b.item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {editing && (
        <EditBookmarkModal
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Add bar — inline paste-to-save
// ──────────────────────────────────────────────────────────────────────

function AddBar() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const normalized = normalizeUrl(url);
  const platform = normalized ? detectPlatform(normalized) : null;

  function save() {
    if (!normalized) {
      toast.error("Paste a valid URL first");
      return;
    }
    const detected = detectPlatform(normalized);
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startTransition(async () => {
      try {
        await captureItem({
          kind: "bookmark",
          title: title.trim() || detected.host,
          sourceUrl: normalized,
          status: "active",
          metadata: {
            url: normalized,
            platform: detected.name,
            host: detected.host,
            color: detected.color,
            tags: tagList,
          },
        });
        toast.success(`Saved to ${detected.name}`);
        setUrl("");
        setTitle("");
        setTags("");
        setExpanded(false);
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  return (
    <div className="life-card p-4 mb-6">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0 transition-colors"
          style={{
            background: platform
              ? `color-mix(in oklch, ${platform.color} 14%, transparent)`
              : "var(--paper-2)",
            color: platform?.color ?? "var(--muted)",
            border: `1px solid ${
              platform
                ? `color-mix(in oklch, ${platform.color} 30%, transparent)`
                : "var(--line)"
            }`,
          }}
        >
          {platform ? (
            <span className="text-[13px] font-semibold tracking-[-0.01em]">
              {platformInitial(platform.name)}
            </span>
          ) : (
            <Bookmark size={15} strokeWidth={1.6} />
          )}
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && normalized) save();
          }}
          type="url"
          placeholder="Paste a link — youtube.com/…, x.com/…, github.com/…"
          className="flex-1 bg-transparent text-[14px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
        />
        {platform && (
          <span className="hidden sm:inline-flex text-[10.5px] uppercase tracking-[0.12em] font-semibold px-2 py-1 rounded-full"
            style={{
              background: `color-mix(in oklch, ${platform.color} 14%, transparent)`,
              color: platform.color,
            }}
          >
            {platform.name}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending || !normalized}
          className="life-btn life-btn-sm life-btn-primary shrink-0"
        >
          <Plus size={13} strokeWidth={2} />
          Save
        </button>
      </div>
      {expanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && normalized) save();
            }}
            placeholder={
              platform ? `Title (defaults to ${platform.host})` : "Title (optional)"
            }
            className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && normalized) save();
            }}
            placeholder="Tags, comma-separated (optional)"
            className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
          />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────────

function BookmarkCard({
  bookmark: b,
  onEdit,
}: {
  bookmark: DerivedBookmark;
  onEdit: () => void;
}) {
  return (
    <div className="group life-card life-card-hover relative overflow-hidden flex flex-col">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: b.color }}
      />
      <a
        href={b.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 p-5 pb-3 block min-h-[140px]"
      >
        <div className="flex items-start gap-3">
          <div
            className="grid place-items-center w-9 h-9 rounded-[9px] text-[13px] font-semibold tracking-[-0.01em] shrink-0"
            style={{
              background: `color-mix(in oklch, ${b.color} 14%, transparent)`,
              color: b.color,
              border: `1px solid color-mix(in oklch, ${b.color} 30%, transparent)`,
            }}
          >
            {platformInitial(b.platform)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-[var(--ink)] line-clamp-2 group-hover:text-[var(--terra)] transition">
              {b.title}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-[11.5px] font-mono text-[var(--muted-2)] truncate">
              {b.host}
              <ExternalLink
                size={10}
                strokeWidth={1.6}
                className="opacity-0 group-hover:opacity-100 transition"
              />
            </div>
          </div>
        </div>
        {b.description && (
          <p className="mt-3 text-[12.5px] text-[var(--muted)] line-clamp-3 leading-relaxed">
            {b.description}
          </p>
        )}
      </a>

      <div className="px-5 pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {b.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold text-[var(--muted)] bg-[var(--bg-2)]"
            >
              <Tag size={9} strokeWidth={1.6} />
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10.5px] tabular-nums font-mono text-[var(--muted-2)]">
            {relDate(b.item.capturedAt)}
          </span>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="opacity-0 group-hover:opacity-100 grid place-items-center w-6 h-6 rounded-[6px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
          >
            <Pencil size={11} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Atoms
// ──────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  hint,
  tone,
  color,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone: "ink" | "terra" | "custom";
  color?: string;
}) {
  const fg =
    tone === "terra"
      ? "var(--terra)"
      : tone === "custom"
      ? color ?? "var(--ink)"
      : "var(--ink)";
  return (
    <div className="life-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-[28px] font-semibold tabular-nums tracking-[-0.02em] leading-none truncate"
        style={{ color: fg }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-[11px] text-[var(--muted)]">{hint}</div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-medium transition border"
      style={
        active
          ? {
              background: `color-mix(in oklch, ${color} 14%, transparent)`,
              color,
              borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
            }
          : {
              background: "var(--paper)",
              color: "var(--muted)",
              borderColor: "var(--line)",
            }
      }
    >
      {label}
      <span
        className="font-mono text-[10.5px] tabular-nums"
        style={{ color: active ? color : "var(--muted-2)" }}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyHero() {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-12 px-6 text-center">
      <div
        className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
        style={{ boxShadow: "var(--shadow-1)" }}
      >
        <Bookmark size={22} strokeWidth={1.6} />
      </div>
      <div className="text-[17px] font-medium text-[var(--ink)]">
        Save links you'll want again.
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        Paste any URL — YouTube videos, X threads, GitHub repos, articles. Life
        OS auto-detects the platform and groups them so they don't disappear
        into the void.
      </p>
    </div>
  );
}
