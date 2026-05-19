"use client";

import { useItemsOfKind } from "@/lib/store/items";
import { BookOpen } from "lucide-react";
import { ReadingList } from "./reading-list";

export default function ReadingPage() {
  const rows = useItemsOfKind("bookmark") ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="life-h1 inline-flex items-center gap-2">
        <BookOpen size={18} className="text-[var(--accent)]" />
        Reading
      </h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Bookmarks, sorted by what&apos;s next.
      </p>

      <ReadingList rows={rows} />
    </div>
  );
}
