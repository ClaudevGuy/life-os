/**
 * Local monogram avatars — a letter tile coloured deterministically from the
 * item's name. Fully offline: no favicon fetching, so the vault keeps its
 * "never leaves this device" promise.
 */

const PALETTE = [
  "var(--terra)",
  "var(--gold)",
  "var(--sage)",
  "var(--sky)",
  "var(--plum)",
] as const;

export function monogram(name: string): { letter: string; color: string } {
  const trimmed = (name ?? "").trim();
  const m = trimmed.match(/[a-z0-9]/i);
  const letter = m ? m[0].toUpperCase() : "?";
  if (!trimmed) return { letter, color: "var(--muted)" };

  let h = 0;
  for (let i = 0; i < trimmed.length; i++) {
    h = (h * 31 + trimmed.charCodeAt(i)) >>> 0;
  }
  return { letter, color: PALETTE[h % PALETTE.length] };
}
