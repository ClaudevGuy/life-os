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
  Layers,
  Star,
  Pencil,
  Clock,
  Menu,
  ImagePlus,
  X,
  Check,
  Bold,
  Italic,
  Code,
  Link2,
  ArrowUpRight,
  CornerDownLeft,
  Shuffle,
  ListTodo,
  Quote,
} from "lucide-react";
import {
  useItemsOfKind,
  useAllItems,
  captureItem,
  updateItem,
  type StoredItem,
} from "@/lib/store/items";
import { linksFor } from "@/lib/links";
import { saveBlob, deleteBlob } from "@/lib/store/blobs";
import { BlobImg } from "@/components/blob-img";
import { ItemActions } from "@/components/item-actions";
import { Markdown } from "@/components/markdown";

type View = "editor" | "deck";

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
  const selectedId = params.get("id");
  // Default landing is the cinematic deck; a selected note (or explicit
  // ?view=editor) drops into the master-detail reader.
  const view: View =
    selectedId || params.get("view") === "editor" ? "editor" : "deck";
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

  function goDeck() {
    router.push("/notes");
  }

  function goEditor() {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", "editor");
    if (!selectedId && rows[0]) sp.set("id", rows[0].id);
    router.push(`/notes?${sp.toString()}`);
  }

  function openNote(id: string) {
    router.push(`/notes?id=${id}`);
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

  if (view === "deck") {
    return (
      <DeckView
        rows={rows}
        filtered={filtered}
        query={query}
        onQuery={setQuery}
        onSwitchToEditor={goEditor}
        onOpen={openNote}
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
      onSwitchToDeck={goDeck}
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
  onSwitchToDeck,
  onCreate,
  creating,
}: {
  rows: StoredItem[];
  filtered: StoredItem[];
  query: string;
  onQuery: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSwitchToDeck: () => void;
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
              onClick={onSwitchToDeck}
              title="Gallery view"
              aria-label="Switch to gallery view"
              className="grid place-items-center w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            >
              <Layers size={15} strokeWidth={1.6} />
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
// WALL view — every note in sight at once, as a mosaic of cards
// ──────────────────────────────────────────────────────────────────────

function DeckView({
  rows,
  filtered,
  query,
  onQuery,
  onSwitchToEditor,
  onOpen,
  onCreate,
  creating,
}: {
  rows: StoredItem[];
  filtered: StoredItem[];
  query: string;
  onQuery: (q: string) => void;
  onSwitchToEditor: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const wall = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }),
    [filtered],
  );

  return (
    <div className="relative flex flex-col h-[calc(100vh-61px)] min-h-0 overflow-hidden">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 55% at 50% -8%, color-mix(in oklch, var(--terra) 10%, transparent), transparent 70%)",
        }}
      />

      <header className="relative z-10 flex items-center gap-3 px-6 pt-5 pb-4 flex-wrap">
        <h1 className="inline-flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          <NotebookPen size={20} className="text-[var(--terra)]" strokeWidth={1.6} />
          Notes
          <span className="text-[14px] font-medium text-[var(--muted)] ml-1 tabular-nums">
            {rows.length}
          </span>
        </h1>
        <div className="relative flex-1 min-w-[160px] max-w-[420px] mx-auto">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full rounded-full bg-[var(--paper)] border border-[var(--line)] pl-10 pr-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSwitchToEditor}
            title="Reading view"
            aria-label="Switch to reading view"
            className="grid place-items-center w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
          >
            <Menu size={15} strokeWidth={1.6} />
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
      </header>

      {wall.length === 0 ? (
        <div className="relative z-10 flex-1 grid place-items-center px-6 text-center">
          <div>
            <p className="text-[14px] text-[var(--muted)]">
              {query ? "No matching notes." : "No notes yet."}
            </p>
            {!query && (
              <button
                type="button"
                onClick={onCreate}
                disabled={creating}
                className="life-btn life-btn-sm life-btn-primary mt-4 mx-auto"
              >
                <Plus size={13} strokeWidth={2} />
                New note
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-8">
          <div
            className="grid gap-4 life-stagger"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 264px), 1fr))",
            }}
          >
            {wall.map((n) => (
              <DeckCard key={n.id} note={n} onClick={() => onOpen(n.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeckCard({
  note: n,
  onClick,
}: {
  note: StoredItem;
  onClick: () => void;
}) {
  const dot = topicColor(n.topic);
  const tag = n.topic ?? statusTag(n.status);
  const cover = ((n.metadata ?? {}) as { photos?: string[] }).photos?.[0];
  const preview = plainPreview(n.body);
  const words = (preview.match(/\S+/g) ?? []).length;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open note: ${n.title ?? "Untitled"}`}
      style={{ "--g": `color-mix(in oklch, ${dot} 42%, transparent)` } as React.CSSProperties}
      className="group relative flex flex-col h-[316px] rounded-[20px] overflow-hidden border border-[var(--line)] bg-[var(--paper)] text-left shadow-[var(--shadow-1)] transition duration-300 will-change-transform hover:-translate-y-1 hover:border-[var(--terra)] hover:shadow-[0_22px_55px_-20px_var(--g)]"
    >
      <div className="relative h-[150px] w-full overflow-hidden shrink-0">
        {cover ? (
          <BlobImg
            id={cover}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(150deg, color-mix(in oklch, ${dot} 32%, var(--paper)), color-mix(in oklch, ${dot} 7%, var(--paper)))`,
            }}
          />
        )}
        {/* Fade the cover into the card body */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 48%, var(--paper))" }}
        />
        {!cover && (
          <NotebookPen
            size={58}
            strokeWidth={1.1}
            className="absolute right-4 top-4 opacity-20"
            style={{ color: dot }}
          />
        )}
        {n.isPinned && (
          <span
            className="absolute left-3.5 top-3.5 grid place-items-center w-7 h-7 rounded-full bg-[var(--paper)]/85 backdrop-blur"
            style={{ color: "var(--gold)" }}
          >
            <Star size={13} fill="currentColor" strokeWidth={0} />
          </span>
        )}
      </div>

      <div className="relative px-4 pb-4 flex flex-col flex-1 min-h-0">
        <span
          className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-semibold uppercase tracking-[0.12em] mb-2"
          style={{ color: dot, background: `color-mix(in oklch, ${dot} 16%, var(--paper))` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
          {tag}
        </span>
        <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--ink)] leading-snug line-clamp-2">
          {n.title ?? "Untitled"}
        </h3>
        <p className="mt-1.5 text-[13px] text-[var(--ink-2)] leading-relaxed line-clamp-3 whitespace-pre-line">
          {preview || "Empty note."}
        </p>
        <div className="mt-auto pt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.13em] font-semibold text-[var(--muted-2)]">
          <span>{relDate(n.updatedAt).toUpperCase()}</span>
          <span className="tabular-nums">
            {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
      </div>
    </button>
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
        {plainPreview(n.body) || "Empty"}
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Selection to restore after a programmatic wrap (set via the toolbar).
  const pendingSel = useRef<[number, number] | null>(null);
  const router = useRouter();

  // Backlinks: who this note links to, and who links back to it.
  const allItems = useAllItems() ?? [];
  const { outgoing, incoming } = useMemo(
    () => linksFor(n.id, allItems),
    [n.id, allItems],
  );

  // When switching notes, drop edit mode and reseed the local fields.
  useEffect(() => {
    setEditing(false);
    setTitle(n.title ?? "");
    setBody(n.body ?? "");
    setPhotos(initialPhotos);
  }, [n.id, n.title, n.body, initialPhotos]);

  // After a toolbar wrap mutates the body, restore the caret/selection.
  useEffect(() => {
    if (pendingSel.current && bodyRef.current) {
      const [s, e] = pendingSel.current;
      pendingSel.current = null;
      const ta = bodyRef.current;
      ta.focus();
      ta.setSelectionRange(s, e);
    }
  }, [body]);

  /**
   * Toggle a markdown wrapper (e.g. ** for bold, * for italic, ` for code)
   * around the current selection. If the selection — or the text just
   * outside it — is already wrapped, the markers are stripped instead.
   */
  function applyWrap(marker: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = body.slice(start, end);
    const m = marker.length;
    const inside =
      sel.startsWith(marker) && sel.endsWith(marker) && sel.length >= 2 * m;
    const outside =
      body.slice(Math.max(0, start - m), start) === marker &&
      body.slice(end, end + m) === marker;

    if (inside) {
      const inner = sel.slice(m, sel.length - m);
      setBody(body.slice(0, start) + inner + body.slice(end));
      pendingSel.current = [start, start + inner.length];
    } else if (outside) {
      setBody(body.slice(0, start - m) + sel + body.slice(end + m));
      pendingSel.current = [start - m, end - m];
    } else {
      setBody(body.slice(0, start) + marker + sel + marker + body.slice(end));
      pendingSel.current =
        sel.length === 0
          ? [start + m, start + m]
          : [start + m, end + m];
    }
  }

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
            <>
              <ConvertMenu
                note={n}
                onConverted={(id) => router.push(`/items/${id}`)}
              />
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="life-btn life-btn-sm life-btn-secondary"
              >
                <Pencil size={12} strokeWidth={1.6} />
                Edit
              </button>
            </>
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
          <div>
            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 mb-2">
              <FormatButton
                label="Bold"
                shortcut="⌘B"
                onClick={() => applyWrap("**")}
              >
                <Bold size={14} strokeWidth={2.25} />
              </FormatButton>
              <FormatButton
                label="Italic"
                shortcut="⌘I"
                onClick={() => applyWrap("*")}
              >
                <Italic size={14} strokeWidth={2.25} />
              </FormatButton>
              <FormatButton
                label="Inline code"
                shortcut="⌘E"
                onClick={() => applyWrap("`")}
              >
                <Code size={14} strokeWidth={2.25} />
              </FormatButton>
              <span className="ml-1.5 text-[11px] text-[var(--muted-2)] hidden sm:inline">
                Select text, then format — or press ⌘B / ⌘I.
              </span>
            </div>
            <textarea
              ref={bodyRef}
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
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  save();
                  return;
                }
                if (e.key === "Escape") {
                  cancel();
                  return;
                }
                if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                  const k = e.key.toLowerCase();
                  if (k === "b") {
                    e.preventDefault();
                    applyWrap("**");
                  } else if (k === "i") {
                    e.preventDefault();
                    applyWrap("*");
                  } else if (k === "e") {
                    e.preventDefault();
                    applyWrap("`");
                  }
                }
              }}
              rows={12}
              placeholder="Empty. Start writing… markdown welcome. Paste an image (⌘V) to attach it."
              className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-4 py-3 text-[15px] leading-[1.7] text-[var(--ink-2)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] focus:bg-[var(--paper)] resize-y transition whitespace-pre-wrap"
            />
          </div>
        ) : body.trim() ? (
          <div className="text-[15px] leading-[1.7] text-[var(--ink-2)]">
            <Markdown>{body}</Markdown>
          </div>
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

      {(outgoing.length > 0 || incoming.length > 0) && (
        <div className="mt-10 pt-6 border-t border-[var(--line)] space-y-5">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-semibold text-[var(--muted-2)]">
            <Link2 size={12} strokeWidth={1.7} />
            Connections
          </div>
          {outgoing.length > 0 && (
            <LinkGroup label="Links to" icon={ArrowUpRight} items={outgoing} />
          )}
          {incoming.length > 0 && (
            <LinkGroup label="Linked from" icon={CornerDownLeft} items={incoming} />
          )}
        </div>
      )}
    </div>
  );
}

function LinkGroup({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  items: StoredItem[];
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2.5">
        <Icon size={12} strokeWidth={1.7} />
        {label}
        <span className="text-[var(--muted-2)] font-mono">· {items.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Link
            key={it.id}
            href={`/items/${it.id}`}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--terra)] hover:bg-[var(--paper-2)] px-3 py-1.5 transition max-w-full"
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: kindColor(it.kind) }}
            />
            <span className="text-[13px] text-[var(--ink-2)] truncate">
              {it.title?.trim() || "Untitled"}
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.1em] text-[var(--muted-2)] font-semibold shrink-0">
              {it.kind}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ConvertMenu({
  note,
  onConverted,
}: {
  note: StoredItem;
  onConverted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function convert(kind: "task" | "highlight", extra: Record<string, unknown>) {
    try {
      await updateItem(note.id, {
        kind,
        metadata: { ...(note.metadata ?? {}), ...extra },
      });
      toast.success(`Converted to ${kind}`);
      setOpen(false);
      onConverted(note.id);
    } catch {
      toast.error("Couldn't convert");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="life-btn life-btn-sm life-btn-ghost"
      >
        <Shuffle size={12} strokeWidth={1.7} />
        Convert
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-[11px] border border-[var(--line-2)] bg-[var(--paper)] py-1.5 z-20"
          style={{ boxShadow: "var(--shadow-3)" }}
        >
          <button
            type="button"
            onClick={() => convert("task", { priority: "medium", completedAt: null })}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--paper-2)] transition"
          >
            <ListTodo size={13} />
            Make a task
          </button>
          <button
            type="button"
            onClick={() => convert("highlight", {})}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-[12.5px] text-[var(--ink-2)] hover:bg-[var(--paper-2)] transition"
          >
            <Quote size={13} />
            Make a highlight
          </button>
        </div>
      )}
    </div>
  );
}

function kindColor(kind: string): string {
  switch (kind) {
    case "task":
      return "var(--terra)";
    case "highlight":
    case "decision":
      return "var(--gold)";
    case "journal":
    case "habit":
      return "var(--sage)";
    case "person":
    case "voice":
    case "area":
      return "var(--plum)";
    case "project":
    case "file":
      return "var(--sky)";
    default:
      return "var(--muted)";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Strip the common markdown markers for plain-text previews, so a bolded
 * note shows "46k NIS" in the sidebar rather than "**46k** NIS".
 */
function plainPreview(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .trim();
}

function FormatButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep the textarea's selection — don't let the button steal focus.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={`${label} (${shortcut})`}
      aria-label={`${label} (${shortcut})`}
      className="grid place-items-center w-8 h-8 rounded-[7px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] active:bg-[var(--bg-2)] transition"
    >
      {children}
    </button>
  );
}

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
