"use client";

import {
  useMemo,
  useState,
  useTransition,
  useEffect,
  useRef,
  Suspense,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  NotebookPen,
  Plus,
  Search,
  LayoutGrid,
  Pencil,
  Clock,
  Menu,
  ImagePlus,
  X,
  Check,
} from "lucide-react";
import {
  useItemsOfKind,
  captureItem,
  updateItem,
  type StoredItem,
} from "@/lib/store/items";
import { saveBlob, deleteBlob } from "@/lib/store/blobs";
import { BlobImg } from "@/components/blob-img";
import { ItemActions } from "@/components/item-actions";

type View = "editor" | "grid";

export default function NotesPage() {
  return (
    <Suspense fallback={null}>
      <NotesScreen />
    </Suspense>
  );
}

function NotesScreen() {
  const rows = useItemsOfKind("note") ?? [];
  const router = useRouter();
  const params = useSearchParams();
  const view: View = params.get("view") === "grid" ? "grid" : "editor";
  const selectedId = params.get("id");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  // Auto-select the first note in editor view when nothing is selected.
  useEffect(() => {
    if (view !== "editor") return;
    if (!selectedId && rows.length > 0) {
      const first = rows[0];
      const sp = new URLSearchParams(params.toString());
      sp.set("id", first.id);
      router.replace(`/notes?${sp.toString()}`);
    }
  }, [view, selectedId, rows, router, params]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.title ?? ""}\n${r.body ?? ""}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  function setView(next: View) {
    const sp = new URLSearchParams(params.toString());
    if (next === "grid") sp.set("view", "grid");
    else sp.delete("view");
    router.replace(`/notes${sp.toString() ? `?${sp.toString()}` : ""}`);
  }

  function selectNote(id: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("id", id);
    router.replace(`/notes?${sp.toString()}`);
  }

  function createNote() {
    startTransition(async () => {
      try {
        const item = await captureItem({
          kind: "note",
          title: null,
          body: null,
        });
        // Drop into editor view so the new note opens immediately.
        const sp = new URLSearchParams(params.toString());
        sp.delete("view");
        sp.set("id", item.id);
        router.replace(`/notes?${sp.toString()}`);
        toast.success("Note created");
      } catch {
        toast.error("Couldn't create note");
      }
    });
  }

  if (view === "grid") {
    return (
      <GridView
        rows={rows}
        filtered={filtered}
        query={query}
        onQuery={setQuery}
        onSwitchToEditor={() => setView("editor")}
        onCreate={createNote}
        creating={pending}
      />
    );
  }

  return (
    <EditorView
      rows={rows}
      filtered={filtered}
      query={query}
      onQuery={setQuery}
      selectedId={selectedId}
      onSelect={selectNote}
      onSwitchToGrid={() => setView("grid")}
      onCreate={createNote}
      creating={pending}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// EDITOR (master-detail) view
// ──────────────────────────────────────────────────────────────────────

function EditorView({
  rows,
  filtered,
  query,
  onQuery,
  selectedId,
  onSelect,
  onSwitchToGrid,
  onCreate,
  creating,
}: {
  rows: StoredItem[];
  filtered: StoredItem[];
  query: string;
  onQuery: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSwitchToGrid: () => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const groups = useMemo(() => groupByRecency(filtered), [filtered]);
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  return (
    <div className="flex h-[calc(100vh-61px)] min-h-0">
      <aside className="w-[380px] shrink-0 flex flex-col border-r border-[var(--line)] bg-[var(--paper)] min-h-0">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            <NotebookPen size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
            Notes
            <span className="text-[14px] font-medium text-[var(--muted)] ml-1 tabular-nums">
              {rows.length}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToGrid}
              title="Grid view"
              aria-label="Switch to grid view"
              className="grid place-items-center w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            >
              <LayoutGrid size={15} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={onCreate}
              disabled={creating}
              title="New note"
              aria-label="New note"
              className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 active:scale-95 transition disabled:opacity-50"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] pl-9 pr-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 min-h-0">
          {filtered.length === 0 ? (
            <div className="px-2 py-10 text-center text-[13px] text-[var(--muted)]">
              {query
                ? "No matching notes."
                : "No notes yet. Tap + to start one."}
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="mt-4 first:mt-1">
                <div className="px-3 pb-2 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
                  {g.label}
                </div>
                <div className="flex flex-col gap-1.5">
                  {g.items.map((n) => (
                    <NoteRow
                      key={n.id}
                      note={n}
                      active={n.id === selectedId}
                      onSelect={() => onSelect(n.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0">
        {selected ? (
          <NoteDetail note={selected} />
        ) : (
          <div className="h-full grid place-items-center text-[13px] text-[var(--muted)]">
            Select a note to read it.
          </div>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// GRID view
// ──────────────────────────────────────────────────────────────────────

function GridView({
  rows,
  filtered,
  query,
  onQuery,
  onSwitchToEditor,
  onCreate,
  creating,
}: {
  rows: StoredItem[];
  filtered: StoredItem[];
  query: string;
  onQuery: (q: string) => void;
  onSwitchToEditor: () => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;

  let pinned = 0;
  let week = 0;
  let month = 0;
  for (const r of rows) {
    if (r.isPinned) pinned++;
    const ts = new Date(r.updatedAt).getTime();
    if (ts >= weekAgo) week++;
    if (ts >= monthAgo) month++;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto pg-enter">
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <NotebookPen size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
            Notes
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1">
            Thoughts, conversation logs, scraps you want to keep.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToEditor}
            title="Editor view"
            className="life-btn life-btn-sm life-btn-secondary"
          >
            <Menu size={13} strokeWidth={1.6} />
            Editor
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="life-btn life-btn-sm life-btn-primary"
          >
            <Plus size={13} strokeWidth={2} />
            New note
          </button>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 life-stagger">
        <Stat label="Total" value={rows.length} tone="ink" />
        <Stat label="Pinned" value={pinned} tone="gold" />
        <Stat label="This week" value={week} tone="sage" />
        <Stat label="This month" value={month} tone="ink" />
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full rounded-[12px] bg-[var(--paper)] border border-[var(--line)] pl-10 pr-3 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 life-card p-12 text-center">
          <p className="text-[14px] text-[var(--muted)]">
            {query ? "No matching notes." : "No notes yet."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 life-stagger">
          {filtered.map((n) => (
            <NoteGridCard key={n.id} note={n} />
          ))}
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
  value: number;
  tone: "ink" | "gold" | "sage";
}) {
  const color =
    tone === "gold"
      ? "var(--gold)"
      : tone === "sage"
      ? "var(--sage)"
      : "var(--ink)";
  return (
    <div className="life-card p-5">
      <div className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-[34px] font-semibold tabular-nums tracking-[-0.02em] leading-none"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

function NoteGridCard({ note: n }: { note: StoredItem }) {
  const dot = topicColor(n.topic);
  const tag = n.topic ?? statusTag(n.status);
  return (
    <Link
      href={`/items/${n.id}`}
      className="life-card life-card-hover flex flex-col min-h-[240px] p-5 transition"
    >
      <h3 className="text-[16px] font-semibold text-[var(--ink)] leading-snug line-clamp-2">
        {n.title ?? "Untitled"}
      </h3>
      <div className="mt-2 text-[13.5px] text-[var(--ink-2)] leading-relaxed line-clamp-6 whitespace-pre-line">
        {n.body?.trim() || <em className="text-[var(--muted)] not-italic">Empty.</em>}
      </div>
      <div className="mt-auto pt-4 border-t border-dashed border-[var(--line)] flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{
            color: dot,
            background: `color-mix(in oklch, ${dot} 14%, transparent)`,
          }}
        >
          {tag}
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted-2)] font-semibold">
          {relDate(n.updatedAt).toUpperCase()}
        </span>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shared atoms
// ──────────────────────────────────────────────────────────────────────

function NoteRow({
  note: n,
  active,
  onSelect,
}: {
  note: StoredItem;
  active: boolean;
  onSelect: () => void;
}) {
  const dot = topicColor(n.topic);
  const tag = n.topic ?? statusTag(n.status);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left rounded-[10px] px-3 py-2.5 transition ${
        active
          ? "bg-[var(--paper-2)]"
          : "bg-transparent hover:bg-[var(--bg-2)]"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{ background: "var(--terra)" }}
        />
      )}
      <div className="flex items-center gap-2">
        <span
          className="w-[6px] h-[6px] rounded-full shrink-0"
          style={{ background: dot }}
        />
        <span className="text-[14px] font-medium text-[var(--ink)] truncate flex-1">
          {n.title ?? "Untitled"}
        </span>
      </div>
      <p className="mt-1 pl-[14px] text-[12.5px] text-[var(--muted)] line-clamp-2 leading-relaxed">
        {n.body?.trim() ? n.body : "Empty"}
      </p>
      <div className="mt-1.5 pl-[14px] flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-[var(--muted-2)]">
        <span>{tag}</span>
        <span>·</span>
        <span>{relDate(n.updatedAt).toUpperCase()}</span>
      </div>
    </button>
  );
}

function NoteDetail({ note: n }: { note: StoredItem }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(n.title ?? "");
  const [body, setBody] = useState(n.body ?? "");
  const initialPhotos = useMemo(
    () => ((n.metadata ?? {}) as { photos?: string[] }).photos ?? [],
    [n.metadata],
  );
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // When switching notes, drop edit mode and reseed the local fields.
  useEffect(() => {
    setEditing(false);
    setTitle(n.title ?? "");
    setBody(n.body ?? "");
    setPhotos(initialPhotos);
  }, [n.id, n.title, n.body, initialPhotos]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      const newIds: string[] = [];
      for (const file of list) {
        try {
          const saved = await saveBlob(file);
          newIds.push(saved.id);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        }
      }
      if (newIds.length === 0) return;
      const next = [...photos, ...newIds];
      setPhotos(next);
      // Persist photo additions immediately so they survive Cancel.
      const meta = { ...(n.metadata ?? {}), photos: next };
      try {
        await updateItem(n.id, { metadata: meta });
        toast.success(
          `${newIds.length} photo${newIds.length === 1 ? "" : "s"} added`,
        );
      } catch {
        toast.error("Couldn't attach photo");
      }
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(id: string) {
    const next = photos.filter((p) => p !== id);
    setPhotos(next);
    const meta = { ...(n.metadata ?? {}), photos: next };
    try {
      await updateItem(n.id, { metadata: meta });
      await deleteBlob(id).catch(() => {});
    } catch {
      // Roll back local state if persistence failed.
      setPhotos(photos);
      toast.error("Couldn't remove photo");
    }
  }

  function save() {
    startTransition(async () => {
      try {
        await updateItem(n.id, {
          title: title.trim() || null,
          body: body.trim() || null,
        });
        toast.success("Saved");
        setEditing(false);
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  function cancel() {
    setTitle(n.title ?? "");
    setBody(n.body ?? "");
    setEditing(false);
  }

  const words = (body.trim().match(/\S+/g) ?? []).length;
  const minRead = Math.max(1, Math.round(words / 220));
  const dot = topicColor(n.topic);
  const tag = n.topic ?? statusTag(n.status);
  const capturedRel = relDate(n.capturedAt);
  const editedRel = relDate(n.updatedAt);

  return (
    <div className="px-8 pt-6 pb-12 max-w-3xl mx-auto pg-enter">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <NotebookPen size={14} strokeWidth={1.6} className="text-[var(--muted)]" />
          <Link href="/notes" className="hover:text-[var(--ink)] transition">
            Notes
          </Link>
          <span className="text-[var(--muted-2)]">›</span>
          <span className="text-[var(--ink)] font-medium truncate max-w-[280px]">
            {title || "Untitled"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!editing && (
            <ItemActions
              id={n.id}
              isPinned={n.isPinned}
              status={n.status}
              backHref="/notes"
            />
          )}
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="life-btn life-btn-sm life-btn-ghost"
              >
                <ImagePlus size={13} strokeWidth={1.6} />
                Photo
              </button>
              <button
                type="button"
                onClick={cancel}
                className="life-btn life-btn-sm life-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="life-btn life-btn-sm life-btn-primary"
              >
                <Check size={13} strokeWidth={2} />
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="life-btn life-btn-sm life-btn-secondary"
            >
              <Pencil size={12} strokeWidth={1.6} />
              Edit
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3 flex-wrap mb-4 text-[11.5px]">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold uppercase tracking-[0.1em] text-[10.5px]"
          style={{
            color: dot,
            background: `color-mix(in oklch, ${dot} 14%, transparent)`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dot }}
          />
          {tag}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
          <Clock size={12} strokeWidth={1.6} />
          {capturedRel === editedRel
            ? `${capturedRel}`
            : `${capturedRel} · edited ${editedRel}`}
        </span>
        <span className="text-[var(--muted)] tabular-nums">
          · {words} word{words === 1 ? "" : "s"} · {minRead} min read
        </span>
      </div>

      {editing ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          autoFocus
          className="w-full bg-transparent border-0 outline-none text-[40px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-0.025em] text-[var(--ink)] placeholder:text-[var(--muted-2)]"
        />
      ) : (
        <h1 className="text-[40px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-0.025em] text-[var(--ink)]">
          {title || "Untitled"}
        </h1>
      )}

      <div className="mt-6">
        {editing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onPaste={(e) => {
              const files: File[] = [];
              for (const item of e.clipboardData.items) {
                if (item.kind === "file") {
                  const f = item.getAsFile();
                  if (f) files.push(f);
                }
              }
              if (files.length > 0) {
                e.preventDefault();
                void uploadFiles(files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
              if (e.key === "Escape") cancel();
            }}
            rows={12}
            placeholder="Empty. Start writing… markdown welcome. Paste an image (⌘V) to attach it."
            className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-4 py-3 text-[15px] leading-[1.7] text-[var(--ink-2)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] focus:bg-[var(--paper)] resize-y transition whitespace-pre-wrap"
          />
        ) : body.trim() ? (
          <p className="text-[15px] leading-[1.7] text-[var(--ink-2)] whitespace-pre-wrap">
            {body}
          </p>
        ) : (
          <p className="text-[15px] text-[var(--muted)]">
            Empty. Click Edit to start writing.
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((id) => (
            <div
              key={id}
              className="relative group rounded-[10px] overflow-hidden border border-[var(--line)] bg-[var(--paper-2)]"
              style={{ aspectRatio: "4 / 3" }}
            >
              <BlobImg id={id} className="w-full h-full object-cover" />
              {editing && (
                <button
                  type="button"
                  onClick={() => removePhoto(id)}
                  className="absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-[var(--bad)] transition"
                  aria-label="Remove photo"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function groupByRecency(rows: StoredItem[]) {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;

  const todayItems: StoredItem[] = [];
  const weekItems: StoredItem[] = [];
  const earlierItems: StoredItem[] = [];

  const sorted = [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  for (const r of sorted) {
    const ts = new Date(r.updatedAt).getTime();
    if (r.isPinned || ts >= today) todayItems.push(r);
    else if (ts >= weekAgo) weekItems.push(r);
    else if (ts >= monthAgo) earlierItems.push(r);
    else earlierItems.push(r);
  }

  const groups: { label: string; items: StoredItem[] }[] = [];
  if (todayItems.length) groups.push({ label: "Today", items: todayItems });
  if (weekItems.length) groups.push({ label: "This week", items: weekItems });
  if (earlierItems.length) groups.push({ label: "Earlier", items: earlierItems });
  return groups;
}

function topicColor(topic: string | null | undefined): string {
  if (!topic) return "var(--muted-2)";
  const palette = [
    "var(--terra)",
    "var(--gold)",
    "var(--sage)",
    "var(--plum)",
    "var(--sky)",
  ];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = (hash << 5) - hash + topic.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function statusTag(status: string): string {
  if (status === "inbox") return "Inbox";
  if (status === "archived") return "Archived";
  if (status === "reference") return "Reference";
  return "Active";
}

function relDate(d: Date) {
  const diffMs = Date.now() - new Date(d).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return "now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
