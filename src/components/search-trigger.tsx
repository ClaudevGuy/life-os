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
      className="w-full max-w-md mx-auto flex items-center gap-2 text-xs text-[var(--text-muted)] px-3 py-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-card)] hover:border-[var(--accent)] hover:text-[var(--text)] transition"
    >
      Search everything…
      <kbd className="ml-auto text-[10px] text-[var(--text-faint)]">⌘K</kbd>
    </button>
  );
}
