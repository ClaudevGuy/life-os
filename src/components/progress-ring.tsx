"use client";

/**
 * Circular progress indicator. Renders a track + an arc that animates as the
 * value changes, with the percentage in the center. Shared by the project
 * detail hero and the projects portfolio band.
 */
export function ProgressRing({
  value,
  color,
  size = 96,
  stroke = 9,
  showLabel = true,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - clamped / 100);
  const c = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--bg-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .55s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="font-semibold tabular-nums tracking-[-0.02em] leading-none"
            style={{ color, fontSize: Math.round(size * 0.24) }}
          >
            {clamped}
            <span
              className="font-medium opacity-70"
              style={{ fontSize: Math.round(size * 0.14) }}
            >
              %
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
