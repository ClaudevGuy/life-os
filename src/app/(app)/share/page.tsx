"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { captureItem } from "@/lib/store/items";
import { detectPlatform, normalizeUrl } from "@/lib/bookmarks";

function ShareInner() {
  const params = useSearchParams();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    (async () => {
      const title = params.get("title") ?? "";
      const text = params.get("text") ?? "";
      const url = params.get("url") ?? "";
      const found = url || text.match(/https?:\/\/\S+/)?.[0] || "";
      try {
        const norm = found ? normalizeUrl(found) : null;
        if (norm) {
          const d = detectPlatform(norm);
          await captureItem({
            kind: "bookmark",
            title: title.trim() || d.host,
            sourceUrl: norm,
            status: "active",
            metadata: { url: norm, platform: d.name, host: d.host, color: d.color, tags: [] },
          });
          router.replace("/bookmarks");
        } else {
          const body = [title, text].filter(Boolean).join("\n").trim();
          const [first, ...rest] = (body || "Shared note").split("\n");
          await captureItem({
            kind: "note",
            title: first.slice(0, 120),
            body: rest.join("\n").trim() || null,
            status: "inbox",
          });
          router.replace("/inbox");
        }
      } catch {
        router.replace("/today");
      }
    })();
  }, [params, router]);

  return (
    <div className="p-8 inline-flex items-center gap-2 text-[var(--muted)]">
      <Loader2 size={16} className="animate-spin" />
      Saving what you shared…
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={null}>
      <ShareInner />
    </Suspense>
  );
}
