"use client";

import { useEffect, useState } from "react";
import { readBlob } from "@/lib/store/blobs";

/**
 * Renders an <img> whose src is a transient blob: URL pulled from IndexedDB.
 * Revokes the URL on unmount or id change so we don't leak browser memory.
 */
export function BlobImg({
  id,
  alt = "",
  className,
  onClick,
  width,
  height,
  style,
}: {
  id: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let url: string | null = null;
    readBlob(id).then((b) => {
      if (revoked || !b) return;
      url = URL.createObjectURL(b.data);
      setSrc(url);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (!src) {
    return (
      <span
        className={className}
        style={{
          ...style,
          width,
          height,
          background: "var(--bg-rail)",
          display: "inline-block",
        }}
      />
    );
  }

  /* eslint-disable-next-line @next/next/no-img-element */
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      width={width}
      height={height}
      style={style}
    />
  );
}
