/**
 * Brand mark — gold gradient badge with a stylised diamond glyph.
 * Used in the sidebar header and when the rail is collapsed.
 */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="relative grid place-items-center shrink-0 transition group-hover:scale-[1.03] group-active:scale-[0.97]"
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background:
          "radial-gradient(120% 80% at 50% -10%, rgba(255,245,220,0.55) 0%, transparent 55%), linear-gradient(180deg, color-mix(in oklch, var(--accent-hot) 92%, white) 0%, var(--accent-hot) 25%, var(--accent) 70%, color-mix(in oklch, var(--accent) 80%, black) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255, 248, 230, 0.6), inset 0 -1px 0 rgba(60, 35, 5, 0.32), inset 0 0 0 1px rgba(255, 220, 170, 0.18), 0 1px 2px rgba(20, 12, 0, 0.35), 0 6px 16px -6px color-mix(in oklch, var(--accent) 55%, transparent), 0 12px 28px -14px color-mix(in oklch, var(--accent) 45%, transparent)",
      }}
    >
      {/* Top sheen */}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          inset: "1px 1px auto 1px",
          height: "45%",
          borderRadius: "9px 9px 0 0",
          background:
            "linear-gradient(180deg, rgba(255,250,235,0.5) 0%, rgba(255,245,220,0.12) 60%, transparent 100%)",
        }}
      />
      {/* Diamond glyph */}
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="relative"
        style={{ filter: "drop-shadow(0 1px 0 rgba(255,245,215,0.45))" }}
      >
        <defs>
          <linearGradient id="lifeos-diamond-stroke" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3a2407" />
            <stop offset="100%" stopColor="#1c1304" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z"
          stroke="url(#lifeos-diamond-stroke)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z"
          stroke="url(#lifeos-diamond-stroke)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          opacity="0.65"
        />
      </svg>
    </span>
  );
}
