"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Database,
  Trash2,
  Shield,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/store/db";
import { importItems } from "@/lib/store/items";
import {
  isStoragePersisted,
  requestPersistentStorage,
  getStorageEstimate,
  formatBytes,
  type StorageEstimate,
} from "@/lib/persist";

export function DataSection() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refreshStorageStatus() {
    const [p, e] = await Promise.all([isStoragePersisted(), getStorageEstimate()]);
    setPersisted(p);
    setEstimate(e);
  }

  useEffect(() => {
    void refreshStorageStatus();
  }, []);

  async function exportJson() {
    setExporting(true);
    try {
      const items = await db.items.toArray();
      const dayNotes = await db.dayNotes.toArray();
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              version: 2,
              count: items.length,
              items,
              dayNotes,
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

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data?.items;
      if (!Array.isArray(arr)) {
        toast.error("That doesn't look like a Life OS export");
        return;
      }
      const n = await importItems(arr);
      // Day-note scratchpads, if the export carried them.
      if (Array.isArray(data?.dayNotes)) {
        const notes = data.dayNotes
          .filter(
            (x: unknown): x is { date: string; body: string; updatedAt?: string } =>
              !!x &&
              typeof (x as { date?: unknown }).date === "string" &&
              typeof (x as { body?: unknown }).body === "string",
          )
          .map((x: { date: string; body: string; updatedAt?: string }) => ({
            date: x.date,
            body: x.body,
            updatedAt: x.updatedAt ? new Date(x.updatedAt) : new Date(),
          }));
        if (notes.length) await db.dayNotes.bulkPut(notes);
      }
      toast.success(`Imported ${n} item${n === 1 ? "" : "s"}`);
      await refreshStorageStatus();
    } catch {
      toast.error("Couldn't read that file");
    } finally {
      setImporting(false);
    }
  }

  async function requestPersist() {
    setRequesting(true);
    try {
      const granted = await requestPersistentStorage();
      await refreshStorageStatus();
      if (granted) {
        toast.success("Persistent storage granted");
      } else {
        toast.error(
          "Browser declined. Keep using Life OS — engagement signals (frequent visits, bookmarking the page) make most browsers auto-grant later.",
        );
      }
    } finally {
      setRequesting(false);
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
      await db.trash.clear();
      await db.dayNotes.clear();
      toast.success("All data cleared");
      await refreshStorageStatus();
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

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition text-left disabled:opacity-50"
      >
        {importing ? (
          <Loader2 size={14} className="text-[var(--accent)] animate-spin" />
        ) : (
          <Upload size={14} className="text-[var(--accent)]" />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium">Import / restore</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Load a Life OS export back in. Merges by id — safe to recover after
            a wipe or to move to a new machine.
          </p>
        </div>
        <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
          .json
        </span>
      </button>

      {/* Persistent storage status + opt-in */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {persisted ? (
            <ShieldCheck size={14} className="text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <Shield size={14} className="text-[var(--text-faint)] mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Persistent storage</span>
              {persisted === null ? (
                <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
                  checking…
                </span>
              ) : persisted ? (
                <span className="text-[10px] text-emerald-400 uppercase tracking-wide">
                  ✓ Granted
                </span>
              ) : (
                <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
                  Not granted
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {persisted
                ? "The browser has promised not to evict your Life OS data under storage pressure. Only an explicit “clear site data” can wipe it now."
                : "Ask the browser to mark Life OS as persistent. Once granted, your data won’t be auto-evicted if disk space runs low. Some browsers prompt; others auto-grant after a few visits."}
            </p>
            {!persisted && persisted !== null && (
              <button
                type="button"
                onClick={requestPersist}
                disabled={requesting}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition disabled:opacity-50"
              >
                {requesting ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Shield size={11} />
                )}
                Request persistent storage
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <Database size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Storage</span>
              {estimate && estimate.quota > 0 && (
                <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
                  {formatBytes(estimate.usage)} of {formatBytes(estimate.quota)} ·{" "}
                  {Math.max(
                    0,
                    Math.round((estimate.usage / estimate.quota) * 100),
                  )}
                  %
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Your data lives in your browser&apos;s IndexedDB. Nothing is sent
              to a server. Export periodically if you want a backup off this
              machine.
            </p>
            {estimate && estimate.quota > 0 && (
              <div className="mt-2 h-1 rounded-full bg-[var(--border-soft)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0.5, (estimate.usage / estimate.quota) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
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
