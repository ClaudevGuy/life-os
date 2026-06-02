"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  Plus,
  ExternalLink,
  Pencil,
  Star,
  Hash,
  Inbox,
  Search,
  X,
} from "lucide-react";
import {
  useItemsOfKind,
  captureItem,
  updateItem,
  type StoredItem,
} from "@/lib/store/items";
import {
  detectPlatform,
  faviconUrl,
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
  pinned: boolean;
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
    pinned: item.isPinned,
  };
}

type Filter =
  | { kind: "all" }
  | { kind: "pinned" }
  | { kind: "platform"; name: string }
  | { kind: "tag"; name: string };

export default function BookmarksPage() {
  const rows = (useItemsOfKind("bookmark") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const bookmarks = useMemo(
    () =>
      rows
        .filter((r) => r.status !== "archived")
        .map(derive)
        .filter((x): x is DerivedBookmark => x !== null)
        .sort(
          (a, b) =>
            new Date(b.item.capturedAt).getTime() -
            new Date(a.item.capturedAt).getTime(),
        ),
    [rows],
  );

  const platformCounts = useMemo(() => {
    const m = new Map<
      string,
      { count: number; color: string; host: string }
    >();
    for (const b of bookmarks) {
      const prev = m.get(b.platform);
      m.set(b.platform, {
        count: (prev?.count ?? 0) + 1,
        color: prev?.color ?? b.color,
        host: prev?.host ?? b.host,
      });
    }
    return [...m.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [bookmarks]);

  const pinnedCount = bookmarks.filter((b) => b.pinned).length;

  const visible = useMemo(() => {
    switch (filter.kind) {
      case "all":
        return bookmarks;
      case "pinned":
        return bookmarks.filter((b) => b.pinned);
      case "platform":
        return bookmarks.filter((b) => b.platform === filter.name);
      case "tag":
        return bookmarks.filter((b) => b.tags.includes(filter.name));
    }
  }, [bookmarks, filter]);

  // Free-text search layered on top of the sidebar filter.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.host.toLowerCase().includes(q) ||
        b.platform.toLowerCase().includes(q) ||
        (b.description?.toLowerCase().includes(q) ?? false) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [visible, query]);

  type Section = {
    name: string;
    color: string;
    host: string;
    items: DerivedBookmark[];
    accent?: "gold";
  };

  const sections = useMemo<Section[]>(() => {
    if (filter.kind === "platform") {
      const first = searched[0];
      return [
        {
          name: filter.name,
          color: first?.color ?? "var(--muted)",
          host: first?.host ?? "",
          items: searched,
        },
      ];
    }
    if (filter.kind === "pinned") {
      return [
        {
          name: "Reading list",
          color: "var(--gold)",
          host: "",
          items: searched,
          accent: "gold",
        },
      ];
    }
    if (filter.kind === "tag") {
      return [
        {
          name: `#${filter.name}`,
          color: "var(--terra)",
          host: "",
          items: searched,
        },
      ];
    }
    // All — pinned shelf first, then platforms by count
    const groups = new Map<string, DerivedBookmark[]>();
    const pinned: DerivedBookmark[] = [];
    for (const b of searched) {
      if (b.pinned) {
        pinned.push(b);
        continue;
      }
      const arr = groups.get(b.platform) ?? [];
      arr.push(b);
      groups.set(b.platform, arr);
    }
    const list: Section[] = [];
    if (pinned.length) {
      list.push({
        name: "Reading list",
        color: "var(--gold)",
        host: "",
        items: pinned,
        accent: "gold",
      });
    }
    const entries = [...groups.entries()].sort(
      (a, b) => b[1].length - a[1].length,
    );
    for (const [name, items] of entries) {
      list.push({
        name,
        color: items[0].color,
        host: items[0].host,
        items,
      });
    }
    return list;
  }, [searched, filter]);

  function togglePin(b: DerivedBookmark) {
    startTransition(async () => {
      try {
        await updateItem(b.item.id, { isPinned: !b.pinned });
      } catch {
        toast.error("Couldn't pin");
      }
    });
  }

  const activeFilterLabel =
    filter.kind === "all"
      ? null
      : filter.kind === "pinned"
        ? "Reading list"
        : filter.kind === "platform"
          ? filter.name
          : `#${filter.name}`;

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
        <p className="text-[14.5px] text-[var(--muted)] mt-1">
          Links worth coming back to.
        </p>
      </header>

      {bookmarks.length === 0 ? (
        <>
          <AddBar />
          <EmptyHero />
        </>
      ) : (
        <div className="grid md:grid-cols-[212px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="md:sticky md:top-8 md:self-start space-y-6">
            <FilterSection>
              <FilterRow
                active={filter.kind === "all"}
                label="All bookmarks"
                count={bookmarks.length}
                onClick={() => setFilter({ kind: "all" })}
                leadingIcon={
                  <Inbox size={13} strokeWidth={1.6} />
                }
              />
              {pinnedCount > 0 && (
                <FilterRow
                  active={filter.kind === "pinned"}
                  label="Reading list"
                  count={pinnedCount}
                  onClick={() => setFilter({ kind: "pinned" })}
                  leadingIcon={
                    <Star
                      size={12}
                      strokeWidth={1.6}
                      fill="var(--gold)"
                      stroke="var(--gold)"
                    />
                  }
                  accent="var(--gold)"
                />
              )}
            </FilterSection>

            {platformCounts.length > 0 && (
              <FilterSection heading="Platforms">
                {platformCounts.map((p) => (
                  <FilterRow
                    key={p.name}
                    active={
                      filter.kind === "platform" && filter.name === p.name
                    }
                    label={p.name}
                    count={p.count}
                    onClick={() =>
                      setFilter({ kind: "platform", name: p.name })
                    }
                    leadingFavicon={{
                      host: p.host,
                      color: p.color,
                      initial: p.name,
                    }}
                  />
                ))}
              </FilterSection>
            )}

            {tagCounts.length > 0 && (
              <FilterSection heading="Tags">
                {tagCounts.slice(0, 20).map((t) => (
                  <FilterRow
                    key={t.name}
                    active={filter.kind === "tag" && filter.name === t.name}
                    label={t.name}
                    count={t.count}
                    onClick={() => setFilter({ kind: "tag", name: t.name })}
                    leadingIcon={
                      <Hash
                        size={12}
                        strokeWidth={1.8}
                        className="opacity-70"
                      />
                    }
                  />
                ))}
              </FilterSection>
            )}
          </aside>

          {/* Content */}
          <div className="min-w-0">
            <AddBar />

            {/* Search toolbar */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] focus-within:border-[var(--terra)] px-3 h-9 transition">
                <Search
                  size={15}
                  strokeWidth={1.6}
                  className="text-[var(--muted)] shrink-0"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search title, site, or tag…"
                  className="flex-1 bg-transparent text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="grid place-items-center w-5 h-5 rounded-[5px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition shrink-0"
                  >
                    <X size={13} strokeWidth={1.8} />
                  </button>
                )}
              </div>
              <span className="hidden sm:block text-[11.5px] font-mono tabular-nums text-[var(--muted-2)] shrink-0">
                {searched.length} {searched.length === 1 ? "link" : "links"}
              </span>
            </div>

            {activeFilterLabel && (
              <div className="mb-4 flex items-center gap-2 text-[12px] text-[var(--muted)]">
                <span>Showing</span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--paper-2)] text-[var(--ink)] font-medium"
                  style={{
                    boxShadow: "inset 0 0 0 1px var(--line)",
                  }}
                >
                  {activeFilterLabel}
                  <span className="font-mono text-[var(--muted-2)]">
                    {searched.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setFilter({ kind: "all" })}
                  className="text-[var(--muted)] hover:text-[var(--terra)] transition underline-offset-2 hover:underline"
                >
                  clear
                </button>
              </div>
            )}

            {searched.length === 0 ? (
              <EmptyFiltered
                query={query}
                onReset={() => {
                  setFilter({ kind: "all" });
                  setQuery("");
                }}
              />
            ) : (
              <div className="space-y-7">
                {sections.map((s) => (
                  <ListSection
                    key={s.name}
                    section={s}
                    onEdit={(item) => setEditing(item)}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
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
// Sidebar
// ──────────────────────────────────────────────────────────────────────

function FilterSection({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {heading && (
        <div className="px-2 pb-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--muted-2)]">
          {heading}
        </div>
      )}
      <div className="flex flex-col gap-[1px]">{children}</div>
    </div>
  );
}

function FilterRow({
  active,
  label,
  count,
  onClick,
  leadingIcon,
  leadingFavicon,
  accent,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  leadingIcon?: React.ReactNode;
  leadingFavicon?: { host: string; color: string; initial: string };
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2.5 w-full px-2 py-[7px] rounded-[8px] text-[13px] transition ${
        active
          ? "bg-[var(--paper-2)] text-[var(--ink)] font-medium"
          : "text-[var(--ink-2)] hover:bg-[var(--bg-2)]"
      }`}
      style={
        active && accent
          ? { boxShadow: `inset 2px 0 0 ${accent}` }
          : undefined
      }
    >
      <span
        className="grid place-items-center w-[18px] h-[18px] shrink-0 overflow-hidden rounded-[4px]"
        style={{ color: accent ?? "var(--muted)" }}
      >
        {leadingFavicon ? (
          <FaviconImg
            host={leadingFavicon.host}
            size={14}
            color={leadingFavicon.color}
            initial={leadingFavicon.initial}
          />
        ) : (
          leadingIcon
        )}
      </span>
      <span className="flex-1 text-left truncate">{label}</span>
      <span
        className={`tabular-nums font-mono text-[10.5px] ${
          active ? "text-[var(--muted)]" : "text-[var(--muted-2)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Content list
// ──────────────────────────────────────────────────────────────────────

function ListSection({
  section,
  onEdit,
  onTogglePin,
}: {
  section: {
    name: string;
    color: string;
    host: string;
    items: DerivedBookmark[];
    accent?: "gold";
  };
  onEdit: (item: StoredItem) => void;
  onTogglePin: (b: DerivedBookmark) => void;
}) {
  return (
    <section>
      <header className="mb-2.5 flex items-center gap-2.5">
        <div
          className="grid place-items-center w-7 h-7 rounded-[8px] shrink-0 overflow-hidden"
          style={{
            background: `color-mix(in oklch, ${section.color} 13%, transparent)`,
            border: `1px solid color-mix(in oklch, ${section.color} 28%, transparent)`,
          }}
        >
          {section.accent === "gold" ? (
            <Star
              size={13}
              strokeWidth={1.6}
              fill="var(--gold)"
              stroke="var(--gold)"
            />
          ) : section.host ? (
            <FaviconImg
              host={section.host}
              size={15}
              color={section.color}
              initial={section.name}
            />
          ) : (
            <Hash
              size={13}
              strokeWidth={1.8}
              style={{ color: section.color }}
            />
          )}
        </div>
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          {section.name}
        </span>
        <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-[var(--bg-2)] text-[10.5px] font-mono font-semibold text-[var(--muted)] tabular-nums">
          {section.items.length}
        </span>
        {section.host && (
          <span className="text-[11px] font-mono text-[var(--muted-2)]">
            {section.host}
          </span>
        )}
        <span
          aria-hidden
          className="flex-1 h-px self-center"
          style={{
            background: `color-mix(in oklch, ${section.color} 18%, var(--line))`,
          }}
        />
      </header>

      <div
        className="rounded-[12px] border bg-[var(--paper)] overflow-hidden"
        style={{
          borderColor:
            section.accent === "gold"
              ? `color-mix(in oklch, var(--gold) 35%, var(--line))`
              : "var(--line)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        {section.items.map((b, i) => (
          <BookmarkRow
            key={b.item.id}
            bookmark={b}
            divider={i > 0}
            onEdit={() => onEdit(b.item)}
            onTogglePin={() => onTogglePin(b)}
          />
        ))}
      </div>
    </section>
  );
}

function BookmarkRow({
  bookmark: b,
  divider,
  onEdit,
  onTogglePin,
}: {
  bookmark: DerivedBookmark;
  divider: boolean;
  onEdit: () => void;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={`group relative flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-[var(--paper-2)] ${
        divider ? "border-t border-[var(--line)]" : ""
      }`}
    >
      {/* Color rail on hover */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition"
        style={{ background: b.color }}
      />

      <div
        className="grid place-items-center w-10 h-10 rounded-[9px] shrink-0 overflow-hidden"
        style={{
          background: `color-mix(in oklch, ${b.color} 13%, transparent)`,
          border: `1px solid color-mix(in oklch, ${b.color} 28%, transparent)`,
        }}
      >
        <FaviconImg
          host={b.host}
          size={20}
          color={b.color}
          initial={b.platform}
        />
      </div>

      <a
        href={b.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 block"
      >
        {/* Title */}
        <div className="flex items-center gap-1.5 min-w-0">
          {b.pinned && (
            <Star
              size={12}
              strokeWidth={1.6}
              fill="var(--gold)"
              stroke="var(--gold)"
              className="shrink-0"
            />
          )}
          <h3 className="min-w-0 text-[14.5px] font-semibold leading-snug text-[var(--ink)] group-hover:text-[var(--terra)] transition truncate">
            {b.title}
          </h3>
          <ExternalLink
            size={11}
            strokeWidth={1.7}
            className="shrink-0 text-[var(--muted-2)] opacity-0 group-hover:opacity-100 transition"
          />
        </div>

        {/* Meta: host · description · tags */}
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] min-w-0">
          <span className="font-mono text-[var(--muted-2)] shrink-0">
            {b.host}
          </span>
          {b.description && (
            <>
              <span className="text-[var(--line-2)] shrink-0">·</span>
              <span className="min-w-0 text-[var(--muted)] truncate">
                {b.description}
              </span>
            </>
          )}
          {b.tags.length > 0 && (
            <span className="hidden md:inline-flex items-center gap-1.5 shrink-0">
              {b.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full text-[10px] font-mono lowercase text-[var(--muted)] bg-[var(--bg-2)]"
                >
                  <Hash size={8} strokeWidth={2} className="opacity-60" />
                  {t}
                </span>
              ))}
            </span>
          )}
        </div>
      </a>

      {/* Right zone: actions (hover) + time */}
      <div className="flex items-center gap-1 shrink-0 self-center pl-2">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onTogglePin();
            }}
            aria-label={b.pinned ? "Unpin" : "Pin to reading list"}
            title={b.pinned ? "Unpin from reading list" : "Pin to reading list"}
            className={`grid place-items-center w-7 h-7 rounded-[7px] transition ${
              b.pinned
                ? "text-[var(--gold)]"
                : "text-[var(--muted)] hover:text-[var(--gold)] hover:bg-[var(--paper)]"
            }`}
          >
            <Star
              size={13}
              strokeWidth={1.6}
              fill={b.pinned ? "var(--gold)" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition"
          >
            <Pencil size={12} strokeWidth={1.6} />
          </button>
        </div>
        <span className="text-[11px] tabular-nums font-mono text-[var(--muted-2)] w-9 text-right shrink-0">
          {relDate(b.item.capturedAt)}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Favicon image with monogram fallback
// ──────────────────────────────────────────────────────────────────────

function FaviconImg({
  host,
  size,
  color,
  initial,
}: {
  host: string;
  size: number;
  color: string;
  initial: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!host || failed) {
    return (
      <span
        className="font-semibold tracking-[-0.01em]"
        style={{ fontSize: Math.round(size * 0.7), color }}
      >
        {platformInitial(initial)}
      </span>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={faviconUrl(host)}
      alt={`${host} favicon`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// Add bar — paste-to-save
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
    <div className="life-card p-3 mb-6">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0 overflow-hidden transition-colors"
          style={{
            background: platform
              ? `color-mix(in oklch, ${platform.color} 14%, transparent)`
              : "var(--paper-2)",
            border: `1px solid ${
              platform
                ? `color-mix(in oklch, ${platform.color} 30%, transparent)`
                : "var(--line)"
            }`,
          }}
        >
          {platform ? (
            <FaviconImg
              host={platform.host}
              size={20}
              color={platform.color}
              initial={platform.name}
            />
          ) : (
            <Bookmark
              size={15}
              strokeWidth={1.6}
              className="text-[var(--muted)]"
            />
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
          <span
            className="hidden sm:inline-flex items-center text-[10.5px] uppercase tracking-[0.12em] font-semibold px-2 py-1 rounded-full"
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
              platform
                ? `Title (defaults to ${platform.host})`
                : "Title (optional)"
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
// Empty states
// ──────────────────────────────────────────────────────────────────────

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
        Save links you&apos;ll want again.
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--muted)] max-w-md mx-auto">
        Paste any URL — YouTube videos, X threads, GitHub repos, articles. Life
        OS auto-detects the platform and groups them so they don&apos;t
        disappear into the void.
      </p>
    </div>
  );
}

function EmptyFiltered({
  query,
  onReset,
}: {
  query: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-10 px-6 text-center">
      <p className="text-[13px] text-[var(--muted)]">
        {query.trim() ? (
          <>
            No bookmarks match “
            <span className="text-[var(--ink)] font-medium">
              {query.trim()}
            </span>
            ”.
          </>
        ) : (
          "Nothing matches that filter yet."
        )}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 life-btn life-btn-sm life-btn-ghost"
      >
        Show all bookmarks
      </button>
    </div>
  );
}
