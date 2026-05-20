"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function TemplateCard({
  template,
}: {
  template: {
    id: string;
    kind: "note" | "decision" | "highlight";
    title: string;
    description: string;
    body: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function use() {
    startTransition(async () => {
      let id: string | null = null;
      try {
        const item = await captureItem({
          kind: template.kind,
          title: template.title,
          body: template.body,
        });
        id = item.id;
      } catch {
        toast.error("Couldn't save");
        return;
      }
      toast.success("Template used");
      if (id) router.push(`/items/${id}`);
    });
  }

  return (
    <div className="life-card life-card-hover p-5 transition flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
            {template.kind}
          </div>
          <h3 className="mt-1 text-base font-semibold text-[var(--text)]">
            {template.title}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
            {template.description}
          </p>
        </div>
        <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
      </div>

      <div className="mt-3 rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] p-3 text-[11px] font-mono whitespace-pre-wrap text-[var(--text-muted)] line-clamp-5 leading-relaxed">
        {template.body}
      </div>

      <button
        type="button"
        onClick={use}
        disabled={pending}
        className="life-btn life-btn-sm life-btn-primary mt-3 w-full"
      >
        Use template <ArrowUpRight size={12} />
      </button>
    </div>
  );
}
