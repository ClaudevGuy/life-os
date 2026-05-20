"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { updateItem, deleteItem } from "@/lib/store/items";

export function ItemActions({
  id,
  isPinned,
  status,
  backHref,
}: {
  id: string;
  isPinned: boolean;
  status: string;
  backHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pinned, setPinned] = useState(isPinned);
  const [archived, setArchived] = useState(status === "archived");

  function togglePin() {
    setPinned((v) => !v);
    startTransition(async () => {
      try {
        await updateItem(id, { isPinned: !pinned });
        toast.success(!pinned ? "Pinned" : "Unpinned");
      } catch {
        setPinned((v) => !v);
        toast.error("Couldn't update");
      }
    });
  }

  function toggleArchive() {
    const next = !archived;
    setArchived(next);
    startTransition(async () => {
      try {
        await updateItem(id, { status: next ? "archived" : "active" });
        toast.success(next ? "Archived" : "Restored");
      } catch {
        setArchived((v) => !v);
        toast.error("Couldn't update");
      }
    });
  }

  function del() {
    if (!confirm("Delete this item? This can't be undone.")) return;
    startTransition(async () => {
      try {
        await deleteItem(id);
        toast.success("Deleted");
        router.push(backHref);
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-sm">
      <ActionBtn
        onClick={togglePin}
        active={pinned}
        pending={pending}
        label={pinned ? "Unpin" : "Pin"}
        icon={Pin}
      />
      <span className="w-px h-4 bg-[var(--border-soft)]" aria-hidden />
      <ActionBtn
        onClick={toggleArchive}
        active={archived}
        pending={pending}
        label={archived ? "Restore" : "Archive"}
        icon={archived ? ArchiveRestore : Archive}
      />
      <span className="w-px h-4 bg-[var(--border-soft)]" aria-hidden />
      <ActionBtn
        onClick={del}
        pending={pending}
        label="Delete"
        icon={Trash2}
        danger
      />
    </div>
  );
}

function ActionBtn({
  onClick,
  active,
  pending,
  label,
  icon: Icon,
  danger,
}: {
  onClick: () => void;
  active?: boolean;
  pending?: boolean;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50 ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : danger
          ? "text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text)]"
      }`}
    >
      <Icon
        size={13}
        className={active && label.startsWith("Unpin") ? "fill-current" : ""}
      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
