"use client";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true }),
        )
      }
      className="w-full max-w-[720px] flex items-center gap-2.5 text-[13.5px] text-[var(--muted)] px-[14px] py-[9px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--terra)] hover:text-[var(--ink)] transition"
    >
      Search everything…
      <kbd className="ml-auto text-[10.5px] font-mono tracking-[0.04em] text-[var(--muted-2)] px-1.5 py-[2px] border border-[var(--line)] rounded-[5px]">⌘K</kbd>
    </button>
  );
}
