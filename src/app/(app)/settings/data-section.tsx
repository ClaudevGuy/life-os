"use client";

import { useState } from "react";
import { Download, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/store/db";

export function DataSection() {
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function exportJson() {
    setExporting(true);
    try {
      const items = await db.items.toArray();
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              version: 1,
              count: items.length,
              items,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${items.length} item${items.length === 1 ? "" : "s"}`);
    } finally {
      setExporting(false);
    }
  }

  async function clearAll() {
    if (
      !confirm(
        "This deletes every item, journal, photo — everything in your local Life OS. Cannot be undone. Export first if you want a backup. Continue?",
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      await db.items.clear();
      await db.blobs.clear();
      toast.success("All data cleared");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
      <button
        type="button"
        onClick={exportJson}
        disabled={exporting}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition text-left disabled:opacity-50"
      >
        <Download size={14} className="text-[var(--accent)]" />
        <div className="flex-1">
          <div className="text-sm font-medium">Export everything</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Download every item as one JSON file. Take your data with you.
          </p>
        </div>
        <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
          .json
        </span>
      </button>

      <div className="px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <Database size={14} className="text-[var(--accent)]" />
          <span className="font-medium">Storage</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)] ml-7">
          Your data lives in your browser&apos;s IndexedDB. Nothing is sent to
          a server. Clearing browser data wipes it — export periodically if
          that matters to you.
        </p>
      </div>

      <button
        type="button"
        onClick={clearAll}
        disabled={clearing}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/5 transition text-left disabled:opacity-50"
      >
        <Trash2 size={14} className="text-red-500/80" />
        <div className="flex-1">
          <div className="text-sm font-medium text-red-500/90">
            Erase everything
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Permanently delete all items and photos in this browser.
          </p>
        </div>
      </button>
    </div>
  );
}
