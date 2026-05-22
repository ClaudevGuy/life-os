"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bookmark,
  Plus,
  ExternalLink,
  Pencil,
  Tag,
  Pin,
  Star,
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

export default function BookmarksPage() {
  const rows = (useItemsOfKind("bookmark") ?? []) as StoredItem[];
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [, startTransition] = useTransition();

  const bookmarks = useMemo(
    () =>
      rows
        .filter((r) => r.status !== "archived")
        .map(derive)
        .filter((x): x is DerivedBookmark => x !== null),
    [rows],
  );

  const pinned = useMemo(
    () =>
      bookmarks
        .filter((b) => b.pinned)
        .sort(
          (a, b) =>
            new Date(b.item.capturedAt).getTime() -
            new Date(a.item.capturedAt).getTime(),
        ),
    [bookmarks],
  );

  const groups = useMemo(() => {
    const m = new Map<string, DerivedBookmark[]>();
    for (const b of bookmarks) {
      if (b.pinned) continue; // pinned ones surface in the dedicated row
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
        host: items[0].host,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [bookmarks]);

  function togglePin(b: DerivedBookmark) {
    startTransition(async () => {
      try {
        await updateItem(b.item.id, { isPinned: !b.pinned });
      } catch {
        toast.error("Couldn't pin");
      }
    });
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pg-enter">
      <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Bookmark
              size={20}
              strokeWidth={1.6}
              className="text-[var(--terra)]"
            />
            Bookmarks
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1 max-w-xl">
            Links worth coming back to.{" "}
            {bookmarks.length > 0 && (
              <span className="text-[var(--muted-2)]">
                {bookmarks.length} saved across {groups.length + (pinned.length > 0 ? 1 : 0)}{" "}
                {groups.length === 1 ? "platform" : "platforms"}.
              </span>
            )}
          </p>
        </div>
      </header>

      <AddBar />

      {bookmarks.length === 0 ? (
        <EmptyHero />
      ) : (
        <div className="space-y-10">
          {/* Pinned reading list */}
          {pinned.length > 0 && (
            <PinnedShelf
              bookmarks={pinned}
              onEdit={(item) => setEditing(item)}
              onTogglePin={togglePin}
            />
          )}

          {/* Groups, one per platform */}
          {groups.map((g) => (
            <PlatformShelf
              key={g.name}
              name={g.name}
              host={g.host}
              color={g.color}
              items={g.items}
              onEdit={(item) => setEditing(item)}
              onTogglePin={togglePin}
            />
          ))}
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
// Pinned shelf — gold-tinted "reading list" at the top
// ──────────────────────────────────────────────────────────────────────

function PinnedShelf({
  bookmarks,
  onEdit,
  onTogglePin,
}: {
  bookmarks: DerivedBookmark[];
  onEdit: (item: StoredItem) => void;
  onTogglePin: (b: DerivedBookmark) => void;
}) {
  return (
    <section>
      <ShelfHeader
        title="Reading list"
        count={bookmarks.length}
        color="var(--gold)"
        leadingIcon={<Pin size={14} strokeWidth={1.6} fill="var(--gold)" />}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookmarks.map((b) => (
          <BookmarkCard
            key={b.item.id}
            bookmark={b}
            onEdit={() => onEdit(b.item)}
            onTogglePin={() => onTogglePin(b)}
          />
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Platform shelf
// ──────────────────────────────────────────────────────────────────────

function PlatformShelf({
  name,
  host,
  color,
  items,
  onEdit,
  onTogglePin,
}: {
  name: string;
  host: string;
  color: string;
  items: DerivedBookmark[];
  onEdit: (item: StoredItem) => void;
  onTogglePin: (b: DerivedBookmark) => void;
}) {
  return (
    <section>
      <ShelfHeader
        title={name}
        host={host}
        count={items.length}
        color={color}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((b) => (
          <BookmarkCard
            key={b.item.id}
            bookmark={b}
            onEdit={() => onEdit(b.item)}
            onTogglePin={() => onTogglePin(b)}
          />
        ))}
      </div>
    </section>
  );
}

function ShelfHeader({
  title,
  host,
  count,
  color,
  leadingIcon,
}: {
  title: string;
  host?: string;
  count: number;
  color: string;
  leadingIcon?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-end gap-3">
      <div
        className="grid place-items-center w-11 h-11 rounded-[12px] shrink-0 overflow-hidden"
        style={{
          background: `color-mix(in oklch, ${color} 14%, transparent)`,
          border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
        }}
      >
        {leadingIcon ? (
          <span style={{ color }}>{leadingIcon}</span>
        ) : host ? (
          <FaviconImg host={host} size={22} color={color} initial={title} />
        ) : (
          <span
            className="text-[15px] font-semibold tracking-[-0.01em]"
            style={{ color }}
          >
            {platformInitial(title)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)] leading-none">
          {title}
        </h2>
        <div className="mt-1.5 text-[11.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted-2)]">
          {count} {count === 1 ? "saved" : "saved"}
          {host && (
            <>
              <span className="mx-1.5 text-[var(--muted-2)]">·</span>
              <span className="font-mono normal-case tracking-[0.04em] text-[var(--muted)]">
                {host}
              </span>
            </>
          )}
        </div>
      </div>
      <span
        aria-hidden
        className="flex-1 hidden sm:block h-px self-center"
        style={{ background: "var(--line)" }}
      />
    </header>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────────

function BookmarkCard({
  bookmark: b,
  onEdit,
  onTogglePin,
}: {
  bookmark: DerivedBookmark;
  onEdit: () => void;
  onTogglePin: () => void;
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
            className="grid place-items-center w-10 h-10 rounded-[10px] shrink-0 overflow-hidden"
            style={{
              background: `color-mix(in oklch, ${b.color} 14%, transparent)`,
              border: `1px solid color-mix(in oklch, ${b.color} 30%, transparent)`,
            }}
          >
            <FaviconImg
              host={b.host}
              size={20}
              color={b.color}
              initial={b.platform}
            />
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
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10.5px] tabular-nums font-mono text-[var(--muted-2)] mr-1">
            {relDate(b.item.capturedAt)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onTogglePin();
            }}
            aria-label={b.pinned ? "Unpin" : "Pin to reading list"}
            title={b.pinned ? "Unpin from reading list" : "Pin to reading list"}
            className={`grid place-items-center w-6 h-6 rounded-[6px] transition ${
              b.pinned
                ? "text-[var(--gold)]"
                : "opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--gold)] hover:bg-[var(--paper-2)]"
            }`}
          >
            <Star
              size={12}
              strokeWidth={1.6}
              fill={b.pinned ? "var(--gold)" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
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
    <div className="life-card p-4 mb-8">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center w-10 h-10 rounded-[10px] shrink-0 overflow-hidden transition-colors"
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
              size={22}
              color={platform.color}
              initial={platform.name}
            />
          ) : (
            <Bookmark
              size={16}
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
