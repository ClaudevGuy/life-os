"use client";

import { useId } from "react";

/**
 * A filled sparkline for the net-worth trend. Renders nothing for <2 points so
 * callers can show their own "not enough history yet" state.
 */
export function Sparkline({
  values,
  color = "var(--terra)",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const id = useId().replace(/[:]/g, "");
  if (values.length < 2) return null;

  const w = 320;
  const h = 88;
  const pad = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(max) || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L${last[0].toFixed(1)},${h} L${first[0].toFixed(1)},${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  );
}

/**
 * A donut chart for asset allocation. The center stays upright (the arcs are
 * rotated, not the wrapper) so a label can be overlaid.
 */
export function Donut({
  slices,
  size = 168,
  thickness = 22,
  center,
}: {
  slices: { label: string; amount: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
}) {
  const total = slices.reduce((a, s) => a + s.amount, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--bg-2)"
            strokeWidth={thickness}
          />
          {total > 0 &&
            slices.map((s, i) => {
              const frac = s.amount / total;
              const dash = Math.max(0, frac * c - 1.5); // tiny gap between slices
              const el = (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${c - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += frac * c;
              return el;
            })}
        </g>
      </svg>
      {center && (
        <div className="absolute inset-0 grid place-items-center text-center px-3">
          {center}
        </div>
      )}
    </div>
  );
}
