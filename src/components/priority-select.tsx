"use client";

export type Priority = "low" | "medium" | "high";

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "var(--sage)",
  medium: "var(--gold)",
  high: "var(--terra)",
};

const ORDER: Priority[] = ["low", "medium", "high"];

/**
 * The app's one priority picker — a clean, equal-width segmented control with
 * a colour dot per level. Used in quick-capture, new-task, the edit dialog,
 * and project tasks so they all look identical.
 */
export function PrioritySelect({
  value,
  onChange,
  className,
}: {
  value: Priority;
  onChange: (p: Priority) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Priority"
      className={`inline-flex items-center gap-1 p-[3px] rounded-[11px] bg-[var(--paper-2)] border border-[var(--line)] ${className ?? ""}`}
    >
      {ORDER.map((p) => {
        const active = value === p;
        const color = PRIORITY_COLORS[p];
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={`inline-flex items-center justify-center gap-1.5 w-[70px] h-[28px] rounded-[8px] text-[12.5px] font-medium capitalize tracking-[0.01em] transition ${
              active
                ? "text-[var(--ink)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            style={
              active
                ? { background: "var(--paper)", boxShadow: "var(--shadow-1)" }
                : undefined
            }
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0 transition"
              style={{ background: color, opacity: active ? 1 : 0.5 }}
            />
            {p}
          </button>
        );
      })}
    </div>
  );
}
