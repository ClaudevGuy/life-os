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
      className="w-full max-w-md mx-auto flex items-center gap-2 text-xs text-zinc-500 px-3 py-1.5 rounded-md border border-zinc-900 hover:border-zinc-800 hover:text-zinc-300 transition"
    >
      Search everything…
      <kbd className="ml-auto text-[10px] text-zinc-600">⌘K</kbd>
    </button>
  );
}
