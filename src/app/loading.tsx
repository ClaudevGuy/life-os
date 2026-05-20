export default function Loading() {
  // Minimal first-paint placeholder. The (app) layout swaps in as soon as
  // the client bundle hydrates and Dexie is ready — usually <100ms.
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-3 text-[12px] text-[var(--muted)]">
        <span
          aria-hidden
          className="block w-2 h-2 rounded-full animate-pulse"
          style={{ background: "var(--terra)" }}
        />
        <span>Loading…</span>
      </div>
    </div>
  );
}
