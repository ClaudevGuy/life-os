"use client";

import { useEffect } from "react";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useTrash,
  restoreItem,
  deleteForever,
  emptyTrash,
  purgeOldTrash,
  type StoredTrash,
} from "@/lib/store/items";

export function TrashSection() {
  const trash = useTrash();

  // Quietly purge anything older than 30 days whenever this opens.
  useEffect(() => {
    void purgeOldTrash(30);
  }, []);

  if (trash === undefined) {
    return (
      <div className="life-card px-4 py-6 flex items-center justify-center text-[var(--text-faint)]">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  async function restore(id: string) {
    try {
      await restoreItem(id);
      toast.success("Restored");
    } catch {
      toast.error("Couldn't restore");
    }
  }

  async function forever(t: StoredTrash) {
    if (
      !confirm(
        `Permanently delete “${label(t)}”? This one can't be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteForever(t.id);
      toast.success("Deleted forever");
    } catch {
      toast.error("Couldn't delete");
    }
  }

  async function empty() {
    if (
      !confirm(
        `Permanently delete all ${trash!.length} item${
          trash!.length === 1 ? "" : "s"
        } in the trash? This can't be undone.`,
      )
    ) {
      return;
    }
    try {
      await emptyTrash();
      toast.success("Trash emptied");
    } catch {
      toast.error("Couldn't empty trash");
    }
  }

  if (trash.length === 0) {
    return (
      <div className="life-card px-4 py-6 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Trash is empty. Deleted items land here and can be restored for 30
          days before they&apos;re cleared automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="life-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-soft)]">
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">
            {trash.length}
          </span>{" "}
          item{trash.length === 1 ? "" : "s"} · auto-clears after 30 days
        </p>
        <button
          type="button"
          onClick={empty}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-red-500/90 hover:border-red-500/40 transition"
        >
          <Trash2 size={11} />
          Empty trash
        </button>
      </div>

      <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--border-soft)]">
        {trash.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 px-4 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-[var(--text)] truncate">
                {label(t)}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-[var(--text-faint)]">
                <span className="uppercase tracking-[0.1em] font-medium">
                  {t.kind}
                </span>
                <span>·</span>
                <span>deleted {rel(t.trashedAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={() => restore(t.id)}
                title="Restore"
                aria-label="Restore"
                className="grid place-items-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-card-hover)] transition"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={() => forever(t)}
                title="Delete forever"
                aria-label="Delete forever"
                className="grid place-items-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-red-500/90 hover:bg-red-500/5 transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function label(t: StoredTrash): string {
  const title = t.title?.trim();
  if (title) return title;
  const body = t.body?.trim();
  if (body) return body.slice(0, 60);
  return `Untitled ${t.kind}`;
}

function rel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
