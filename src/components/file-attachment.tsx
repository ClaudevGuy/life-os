"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink } from "lucide-react";
import { readBlob, downloadBlob } from "@/lib/store/blobs";
import { fileMetaFromName, formatBytes } from "@/lib/file-kind";

type Meta = {
  fileBlobId?: string;
  fileName?: string;
  fileType?: string | null;
  fileBytes?: number;
};

/**
 * Rich attachment card shown at the top of a file item's detail page.
 * For PDFs and plain text we also offer an inline preview via a transient
 * blob: URL (revoked on unmount).
 */
export function FileAttachment({
  metadata,
}: {
  itemId: string;
  metadata: Record<string, unknown>;
}) {
  const meta = metadata as Meta;
  const fm = fileMetaFromName(meta.fileName);
  const Icon = fm.icon;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  const canPreviewInline =
    fm.category === "pdf" ||
    fm.category === "image" ||
    fm.category === "audio" ||
    fm.category === "video";

  useEffect(() => {
    if (!meta.fileBlobId) {
      setMissing(true);
      return;
    }
    if (!canPreviewInline) return;
    let revoked = false;
    let url: string | null = null;
    readBlob(meta.fileBlobId).then((b) => {
      if (revoked) return;
      if (!b) {
        setMissing(true);
        return;
      }
      url = URL.createObjectURL(b.data);
      setPreviewUrl(url);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meta.fileBlobId, canPreviewInline]);

  async function onDownload() {
    if (!meta.fileBlobId) {
      toast.error("File data missing");
      return;
    }
    const ok = await downloadBlob(meta.fileBlobId, meta.fileName ?? "file");
    if (!ok) toast.error("File data missing");
  }

  async function onOpenNewTab() {
    if (!meta.fileBlobId) return;
    const b = await readBlob(meta.fileBlobId);
    if (!b) {
      toast.error("File data missing");
      return;
    }
    const url = URL.createObjectURL(b.data);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="mt-8 life-card overflow-hidden">
      <div
        aria-hidden
        className="h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${fm.tint}, transparent)`,
        }}
      />
      <div className="p-5 flex items-center gap-4">
        <div
          className="grid place-items-center w-14 h-14 rounded-xl shrink-0"
          style={{
            background: `color-mix(in oklch, ${fm.tint} 16%, transparent)`,
            color: fm.tint,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: fm.tint }}>
            {fm.label}
          </div>
          <div className="mt-0.5 text-[15px] font-medium text-[var(--text)] truncate">
            {meta.fileName ?? "Untitled file"}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-faint)] tabular-nums">
            {meta.fileBytes != null ? formatBytes(meta.fileBytes) : ""}
            {meta.fileType ? <span className="ml-2">· {meta.fileType}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canPreviewInline && (
            <button
              type="button"
              onClick={onOpenNewTab}
              disabled={missing}
              className="life-btn life-btn-sm life-btn-secondary"
            >
              <ExternalLink size={12} />
              Open
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            disabled={missing}
            className="life-btn life-btn-sm life-btn-primary"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {missing && (
        <div className="px-5 pb-4 text-[12px] text-red-400">
          The underlying blob is missing — it may have been removed on another
          device, or browser storage was cleared.
        </div>
      )}

      {canPreviewInline && previewUrl && fm.category === "pdf" && (
        <div className="border-t border-[var(--border-soft)]">
          <iframe
            src={previewUrl}
            title={meta.fileName ?? "PDF preview"}
            className="w-full h-[640px] bg-[var(--bg-rail)]"
          />
        </div>
      )}
      {canPreviewInline && previewUrl && fm.category === "image" && (
        <div className="border-t border-[var(--border-soft)] grid place-items-center bg-[var(--bg-rail)] p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={meta.fileName ?? "image preview"}
            className="max-h-[640px] rounded-lg shadow-2xl"
          />
        </div>
      )}
      {canPreviewInline && previewUrl && fm.category === "audio" && (
        <div className="border-t border-[var(--border-soft)] p-5">
          <audio src={previewUrl} controls className="w-full" />
        </div>
      )}
      {canPreviewInline && previewUrl && fm.category === "video" && (
        <div className="border-t border-[var(--border-soft)] bg-black">
          <video src={previewUrl} controls className="w-full max-h-[640px]" />
        </div>
      )}
    </div>
  );
}
