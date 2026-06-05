import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { C, FONT, GRAD } from "./theme";

/* ─────────────────────────────────────────────────────────────────────────
 * Animated dark background — drifting accent glows + grid + vignette.
 * Driven by the global frame so it stays alive across every scene.
 * ───────────────────────────────────────────────────────────────────────── */
export const Bg: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const Blob: React.FC<{
    x: number;
    y: number;
    r: number;
    color: string;
    phase: number;
    opacity: number;
  }> = ({ x, y, r, color, phase, opacity }) => {
    const dx = Math.sin(frame / 95 + phase) * 50;
    const dy = Math.cos(frame / 120 + phase) * 42;
    return (
      <div
        style={{
          position: "absolute",
          left: x + dx,
          top: y + dy,
          width: r,
          height: r,
          borderRadius: "50%",
          background: color,
          filter: "blur(110px)",
          opacity,
        }}
      />
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 120% at 50% -10%, ${C.bg2}, ${C.bg})`,
      }}
    >
      <Blob x={-180} y={-140} r={620} color={C.terra} phase={0} opacity={0.22} />
      <Blob x={width - 460} y={90} r={560} color={C.violet} phase={2.1} opacity={0.2} />
      <Blob x={width * 0.34} y={height - 380} r={520} color={C.sky} phase={4.2} opacity={0.13} />
      {/* grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          WebkitMaskImage:
            "radial-gradient(75% 75% at 50% 42%, #000 0%, transparent 72%)",
          maskImage:
            "radial-gradient(75% 75% at 50% 42%, #000 0%, transparent 72%)",
          opacity: 0.55,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{ boxShadow: "inset 0 0 420px 90px rgba(0,0,0,0.62)" }}
      />
    </AbsoluteFill>
  );
};

/* ─── Logo mark (the app's leaf/spark glyph) ───────────────────────────── */
export const Logo: React.FC<{
  size: number;
  draw?: number; // 0..1 path draw-in
  glow?: number; // 0..1 glow intensity
}> = ({ size, draw = 1, glow = 0.6 }) => {
  const r = size * 0.22;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{
        filter: `drop-shadow(0 0 ${26 * glow}px rgba(226,103,74,${0.75 * glow}))`,
        borderRadius: r,
      }}
    >
      <rect width="32" height="32" rx="7.2" fill="#D45A3F" />
      <g
        fill="none"
        stroke="#FBF7EE"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 44, strokeDashoffset: 44 * (1 - draw) }}
      >
        <path d="M16 12.5 V25" />
        <path d="M15.4 19 Q13.75 13.45 8 12.8 Q9.65 18.35 15.4 19 Z" />
        <path d="M16.6 19 Q18.25 13.45 24 12.8 Q22.35 18.35 16.6 19 Z" />
      </g>
      <circle cx="16" cy="9.5" r="2.4" fill="#FBF7EE" opacity={draw} />
    </svg>
  );
};

export const Wordmark: React.FC<{ size: number }> = ({ size }) => (
  <span
    style={{
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "-0.03em",
      color: C.ink,
    }}
  >
    Life<span style={{ color: C.terra }}>·</span>OS
  </span>
);

/* ─── Gradient headline text ───────────────────────────────────────────── */
export const Grad: React.FC<{
  children: React.ReactNode;
  gradient?: string;
}> = ({ children, gradient = GRAD }) => (
  <span
    style={{
      backgroundImage: gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    }}
  >
    {children}
  </span>
);

/* ─── Glass card ───────────────────────────────────────────────────────── */
export const Glass: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  pad?: number;
}> = ({ children, style, pad = 28 }) => (
  <div
    style={{
      background: C.card,
      border: `1px solid ${C.line2}`,
      borderRadius: 22,
      padding: pad,
      boxShadow: "0 40px 120px -40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
      backdropFilter: "blur(8px)",
      ...style,
    }}
  >
    {children}
  </div>
);

/* ─── Feature chip ─────────────────────────────────────────────────────── */
export const Chip: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
}> = ({ icon, label, color }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      padding: "13px 22px 13px 16px",
      borderRadius: 999,
      background: C.card,
      border: `1px solid ${C.line2}`,
      fontFamily: FONT,
      fontWeight: 600,
      fontSize: 27,
      color: C.ink,
    }}
  >
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: 42,
        height: 42,
        borderRadius: 12,
        background: `color-mix(in oklab, ${color} 22%, transparent)`,
        color,
      }}
    >
      {icon}
    </span>
    {label}
  </div>
);

/* ─── Motion helpers ───────────────────────────────────────────────────── */

/** Spring fade + rise, delayed by `delay` frames. */
export const FadeUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, y = 26, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, mass: 0.7 },
    durationInFrames: 26,
  });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${(1 - s) * y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Per-scene wrapper: crossfade in/out over the constant dark bg + slight rise. */
export const Scene: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(
    frame,
    [durationInFrames - 16, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const y = interpolate(frame, [0, 22], [22, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(inOp, outOp),
        justifyContent: "center",
        alignItems: "center",
        padding: 120,
        ...style,
      }}
    >
      <div style={{ transform: `translateY(${y}px)`, width: "100%" }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Section kicker label (small uppercase). */
export const Kicker: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = C.terra,
}) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);
