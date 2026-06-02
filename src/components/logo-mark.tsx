/**
 * Brand mark — terracotta squircle with a cream "sprout" glyph (a seed-dot
 * over two leaves on a stem). The tile stays terracotta in both themes; the
 * wordmark beside it is live text that flips colour with the theme.
 */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center shrink-0 overflow-hidden transition group-hover:scale-[1.03] group-active:scale-[0.97]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        boxShadow:
          "0 1px 2px rgba(20,12,0,0.18), 0 6px 16px -8px color-mix(in oklch, var(--terra) 50%, transparent)",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" fill="#D45A3F" />
        <g
          fill="none"
          stroke="#FBF7EE"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 12.5 V25" />
          <path d="M15.4 19 Q13.75 13.45 8 12.8 Q9.65 18.35 15.4 19 Z" />
          <path d="M16.6 19 Q18.25 13.45 24 12.8 Q22.35 18.35 16.6 19 Z" />
        </g>
        <circle cx="16" cy="9.5" r="2.4" fill="#FBF7EE" />
      </svg>
    </span>
  );
}
