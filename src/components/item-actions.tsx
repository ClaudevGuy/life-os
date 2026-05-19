"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, Archive, ArchiveRestore, Trash2 } from "lucide-react";

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

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed");
  }

  function togglePin() {
    setPinned((v) => !v);
    startTransition(async () => {
      try {
        await patch({ isPinned: !pinned });
        toast.success(!pinned ? "Pinned" : "Unpinned");
        router.refresh();
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
        await patch({ status: next ? "archived" : "active" });
        toast.success(next ? "Archived" : "Restored");
        router.refresh();
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
        const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success("Deleted");
        router.push(backHref);
        router.refresh();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <ActionBtn
        onClick={togglePin}
        active={pinned}
        pending={pending}
        label={pinned ? "Unpin" : "Pin"}
        icon={Pin}
      />
      <ActionBtn
        onClick={toggleArchive}
        active={archived}
        pending={pending}
        label={archived ? "Restore" : "Archive"}
        icon={archived ? ArchiveRestore : Archive}
      />
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
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition disabled:opacity-50 ${
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : danger
          ? "text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text)]"
      }`}
    >
      <Icon
        size={12}
        className={active && label.startsWith("Unpin") ? "fill-current" : ""}
      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
