"use client";

import { AskClient } from "./ask-client";
import { useAllItems } from "@/lib/store/items";
import { Sparkles } from "lucide-react";

export default function AskPage() {
  const items = useAllItems() ?? [];
  const count = items.length;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-10 h-10 rounded-xl bg-[var(--accent-soft)] shadow-[0_0_20px_rgba(212,168,102,0.18)]">
          <Sparkles size={18} className="text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight life-shine">
            Ask my notes
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Chat with everything you&apos;ve captured · {count.toLocaleString()}{" "}
            item{count === 1 ? "" : "s"} searchable
          </p>
        </div>
      </div>

      <div className="mt-8">
        <AskClient />
      </div>
    </div>
  );
}
