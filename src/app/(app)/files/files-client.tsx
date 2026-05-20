"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Files as FilesIcon,
  Upload,
  Search,
  Download,
  Trash2,
  Pin,
  ExternalLink,
} from "lucide-react";
import {
  useItemsOfKind,
  captureItem,
  updateItem,
  deleteItem,
  type StoredItem,
} from "@/lib/store/items";
import { saveFileBlob, deleteBlob, downloadBlob } from "@/lib/store/blobs";
import { fileMetaFromName, formatBytes, type FileCategory } from "@/lib/file-kind";

type FilterCat = "all" | FileCategory;

const FILTER_LABELS: Record<FilterCat, string> = {
  all: "All",
  pdf: "PDFs",
  word: "Word",
  spreadsheet: "Sheets",
  presentation: "Slides",
  text: "Text",
  markdown: "Markdown",
  code: "Code",
  archive: "Archives",
  image: "Images",
  audio: "Audio",
  video: "Video",
  other: "Other",
};

export function FilesClient() {
  const rows = useItemsOfKind("file") ?? [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterCat>("all");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalBytes = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const m = (r.metadata ?? {}) as { fileBytes?: number };
        return sum + (m.fileBytes ?? 0);
      }, 0),
    [rows],
  );

  const categoryCounts = useMemo(() => {
    const c: Partial<Record<FilterCat, number>> = { all: rows.length };
    for (const r of rows) {
      const m = (r.metadata ?? {}) as { fileName?: string };
      const cat = fileMetaFromName(m.fileName).category;
      c[cat] = (c[cat] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const visibleCategories = useMemo(() => {
    const all: FilterCat[] = [
      "all",
      "pdf",
      "word",
      "spreadsheet",
      "presentation",
      "text",
      "markdown",
      "code",
      "archive",
      "image",
      "audio",
      "video",
      "other",
    ];
    return all.filter((c) => c === "all" || (categoryCounts[c] ?? 0) > 0);
  }, [categoryCounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const m = (r.metadata ?? {}) as { fileName?: string };
      const cat = fileMetaFromName(m.fileName).category;
      if (filter !== "all" && cat !== filter) return false;
      if (q) {
        const hay = `${r.title ?? ""}\n${m.fileName ?? ""}\n${r.body ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, filter]);

  const pinnedRows = filtered.filter((r) => r.isPinned);
  const otherRows = filtered.filter((r) => !r.isPinned);

  const uploadFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (files.length === 0) return;
    setUploading(true);
    let okCount = 0;
    for (const f of files) {
      try {
        const blob = await saveFileBlob(f);
        await captureItem({
          kind: "file",
          title: f.name,
          status: "active",
          metadata: {
            fileBlobId: blob.id,
            fileName: f.name,
            fileType: f.type || null,
            fileBytes: f.size,
          },
        });
        okCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.error(`${f.name}: ${message}`);
      }
    }
    setUploading(false);
    if (okCount > 0) {
      toast.success(okCount === 1 ? "File added" : `${okCount} files added`);
    }
  }, []);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className="p-8 max-w-6xl mx-auto"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <FilesIcon size={18} style={{ color: "var(--kind-file)" }} />
            Files
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            PDFs, Word, text, slides, code — every byte lives in your browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="life-btn life-btn-primary"
        >
          <Upload size={13} />
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Files" value={String(rows.length)} />
        <Stat label="Storage" value={formatBytes(totalBytes)} />
        <Stat label="Pinned" value={String(rows.filter((r) => r.isPinned).length)} tone="accent" />
        <Stat
          label="This week"
          value={String(
            rows.filter(
              (r) =>
                Date.now() - new Date(r.capturedAt).getTime() < 7 * 86_400_000,
            ).length,
          )}
          tone="good"
        />
      </div>

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="w-full bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-full pl-8 pr-3 py-1.5 text-sm placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)] transition"
          />
        </div>
        {visibleCategories.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {visibleCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`inline-flex items-center gap-1 text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition ${
                  filter === c
                    ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-soft)] hover:border-[var(--border-strong)]"
                }`}
              >
                {FILTER_LABELS[c]}
                <span className="text-[var(--text-faint)] tabular-nums">
                  {categoryCounts[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <FilesEmpty
          hasQuery={Boolean(query || filter !== "all")}
          onUpload={() => inputRef.current?.click()}
        />
      ) : (
        <>
          {pinnedRows.length > 0 && (
            <section className="mt-8 life-rise">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3 inline-flex items-center gap-2">
                <Pin size={10} className="text-[var(--accent)] fill-[var(--accent)]" />
                Pinned
                <span className="text-[var(--text-faint)] font-mono">·</span>
                <span className="tabular-nums">{pinnedRows.length}</span>
              </h2>
              <FileGrid rows={pinnedRows} />
            </section>
          )}

          <section className="mt-8 life-rise" style={{ animationDelay: "120ms" }}>
            {pinnedRows.length > 0 && (
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)] mb-3">
                All files
                <span className="text-[var(--text-faint)] font-mono mx-2">·</span>
                <span className="tabular-nums">{otherRows.length}</span>
              </h2>
            )}
            <FileGrid rows={otherRows} />
          </section>
        </>
      )}

      {dragOver && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 pointer-events-none grid place-items-center bg-[var(--accent-glow)] backdrop-blur-sm"
        >
          <div
            className="rounded-2xl border-2 border-dashed px-10 py-8 text-center bg-[var(--bg-card)]/85"
            style={{ borderColor: "var(--accent)" }}
          >
            <Upload size={26} className="mx-auto text-[var(--accent)]" />
            <div className="mt-2 text-sm font-medium text-[var(--text)]">
              Drop to upload
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Stored locally in your browser
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "good";
}) {
  const colorClass =
    tone === "accent"
      ? "text-[var(--accent)]"
      : tone === "good"
      ? "text-emerald-300"
      : "text-[var(--text)]";
  return (
    <div className="life-card p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}

function FileGrid({ rows }: { rows: StoredItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 life-stagger">
      {rows.map((it) => (
        <FileCard key={it.id} item={it} />
      ))}
    </div>
  );
}

function FileCard({ item }: { item: StoredItem }) {
  const meta = (item.metadata ?? {}) as {
    fileBlobId?: string;
    fileName?: string;
    fileBytes?: number;
  };
  const fm = fileMetaFromName(meta.fileName);
  const Icon = fm.icon;

  async function onDownload(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!meta.fileBlobId) {
      toast.error("File data missing");
      return;
    }
    const ok = await downloadBlob(meta.fileBlobId, meta.fileName ?? item.title ?? "file");
    if (!ok) toast.error("File data missing");
  }

  async function onTogglePin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await updateItem(item.id, { isPinned: !item.isPinned });
    toast.success(!item.isPinned ? "Pinned" : "Unpinned");
  }

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this file? This can't be undone.")) return;
    if (meta.fileBlobId) await deleteBlob(meta.fileBlobId);
    await deleteItem(item.id);
    toast.success("Deleted");
  }

  return (
    <Link
      href={`/items/${item.id}`}
      className="group life-card life-card-hover transition relative overflow-hidden flex flex-col min-h-[140px]"
      style={
        item.isPinned
          ? {
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px color-mix(in oklab, var(--accent) 22%, transparent)",
            }
          : undefined
      }
    >
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r opacity-60 group-hover:opacity-100 transition"
        style={{ background: fm.tint }}
      />
      <div className="flex items-start gap-3 p-4 pl-5">
        <div
          className="grid place-items-center w-11 h-11 rounded-xl shrink-0 transition group-hover:scale-105"
          style={{
            background: `color-mix(in oklch, ${fm.tint} 16%, transparent)`,
            color: fm.tint,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <span className="text-[13.5px] font-medium text-[var(--text)] truncate flex-1 leading-snug">
              {item.title ?? meta.fileName ?? "Untitled file"}
            </span>
            {item.isPinned && (
              <Pin
                size={11}
                className="mt-1 shrink-0 text-[var(--accent)] fill-[var(--accent)]"
              />
            )}
          </div>
          <div
            className="mt-1 text-[10px] uppercase tracking-[0.14em]"
            style={{ color: fm.tint }}
          >
            {fm.label}
          </div>
          {item.summary && (
            <p className="mt-1.5 text-[12px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
              {item.summary}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto px-4 pb-3 pl-5 flex items-center gap-2 text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
        <span className="tabular-nums">
          {meta.fileBytes != null ? formatBytes(meta.fileBytes) : "—"}
        </span>
        <span className="ml-auto">{relDate(item.capturedAt)}</span>
      </div>

      <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <CardAction onClick={onDownload} label="Download" icon={Download} />
        <CardAction
          onClick={onTogglePin}
          label={item.isPinned ? "Unpin" : "Pin"}
          icon={Pin}
          active={item.isPinned}
        />
        <CardAction onClick={onDelete} label="Delete" icon={Trash2} danger />
      </div>
    </Link>
  );
}

function CardAction({
  onClick,
  label,
  icon: Icon,
  active,
  danger,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid place-items-center w-7 h-7 rounded-md border transition ${
        active
          ? "bg-[var(--accent-soft)] border-[var(--accent-soft)] text-[var(--accent)]"
          : danger
          ? "bg-[var(--bg-card)] border-[var(--border-soft)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10"
          : "bg-[var(--bg-card)] border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
      }`}
    >
      <Icon size={12} />
    </button>
  );
}

function FilesEmpty({
  hasQuery,
  onUpload,
}: {
  hasQuery: boolean;
  onUpload: () => void;
}) {
  if (hasQuery) {
    return (
      <div className="mt-12 life-card p-10 text-center">
        <Search size={20} className="mx-auto text-[var(--text-faint)]" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">No matching files.</p>
        <p className="mt-1 text-xs text-[var(--text-faint)]">
          Try a different filter or clear the search.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-12 relative overflow-hidden life-card p-12 text-center">
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, color-mix(in oklch, var(--kind-file) 28%, transparent), transparent 60%)",
        }}
      />
      <div className="relative">
        <div
          className="mx-auto grid place-items-center w-14 h-14 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          style={{
            background: "color-mix(in oklch, var(--kind-file) 18%, transparent)",
            color: "var(--kind-file)",
          }}
        >
          <FilesIcon size={22} />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-tight life-shine">
          A place for the documents that matter
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-sm mx-auto">
          Drop PDFs, Word docs, text files, slides — anything up to 25&nbsp;MB
          each. They live in your browser, never on a server.
        </p>
        <div className="mt-5 inline-flex items-center gap-3">
          <button
            type="button"
            onClick={onUpload}
            className="life-btn life-btn-primary"
          >
            <Upload size={13} />
            Upload a file
          </button>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-faint)]">
            <ExternalLink size={11} /> or drag &amp; drop anywhere
          </span>
        </div>
      </div>
    </div>
  );
}

function relDate(d: Date) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
