"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, Folder, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import {
  downloadBackup,
  restoreFromObject,
  supportsFolderBackup,
  pickBackupDir,
  backupDirName,
  forgetBackupDir,
  backupToFolderNow,
  lastBackupAt,
} from "@/lib/backup";

function ago(ts: number | null): string {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function BackupsSection() {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dir, setDir] = useState<string | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supported = supportsFolderBackup();

  async function refresh() {
    setDir(await backupDirName());
    setLast(lastBackupAt());
  }
  useEffect(() => {
    setMounted(true);
    void refresh();
  }, []);

  async function backupNow() {
    setBusy(true);
    try {
      await downloadBackup();
      setLast(lastBackupAt());
      toast.success("Backup downloaded");
    } finally {
      setBusy(false);
    }
  }
  async function connect() {
    setBusy(true);
    try {
      const ok = await pickBackupDir();
      if (ok) toast.success("Folder connected — auto-backups on");
      else toast.error("Couldn't connect a folder");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    await forgetBackupDir();
    await refresh();
    toast.success("Auto-backups off");
  }
  async function backupFolder() {
    setBusy(true);
    try {
      const ok = await backupToFolderNow();
      if (ok) toast.success("Backed up to folder");
      else toast.error("Backup failed");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function restore(file: File) {
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      const { items } = await restoreFromObject(data);
      toast.success(`Restored ${items} item${items === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't read that backup");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
      <button
        type="button"
        onClick={backupNow}
        disabled={busy}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition text-left disabled:opacity-50"
      >
        <Download size={14} className="text-[var(--accent)]" />
        <div className="flex-1">
          <div className="text-sm font-medium">Back up now</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            A full snapshot — items, health, finance, day notes, and your
            encrypted vault.
          </p>
        </div>
        <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide tabular-nums">
          {last ? `last ${ago(last)}` : ".json"}
        </span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void restore(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition text-left disabled:opacity-50"
      >
        <Upload size={14} className="text-[var(--accent)]" />
        <div className="flex-1">
          <div className="text-sm font-medium">Restore from backup</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Merge a backup file back in — to recover after a wipe or move
            machines.
          </p>
        </div>
      </button>

      {supported &&
        (dir ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <Folder size={14} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                Auto-backups → {dir}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                A snapshot is written here automatically (~every 12h while
                open). Last {ago(last)}.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={backupFolder}
                disabled={busy}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition"
              >
                Back up
              </button>
              <button
                type="button"
                onClick={disconnect}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--bad)] transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition text-left disabled:opacity-50"
          >
            <FolderOpen size={14} className="text-[var(--accent)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                Automatic backups to a folder
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Pick a folder (e.g. a synced Drive/Dropbox folder) and Life OS
                writes a fresh backup there on its own.
              </p>
            </div>
          </button>
        ))}
    </div>
  );
}
