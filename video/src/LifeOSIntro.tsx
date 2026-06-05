import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  ListTodo,
  Flame,
  NotebookPen,
  Wallet,
  Shield,
  Sparkles,
  Target,
  HeartPulse,
  CalendarDays,
  Music,
  Coins,
  LineChart,
  Lock,
  Check,
  TrendingUp,
  Waypoints,
  KeyRound,
  CreditCard,
} from "lucide-react";
import { C, FONT, GRAD, GRAD_COOL } from "./theme";
import {
  Bg,
  Logo,
  Wordmark,
  Grad,
  Glass,
  Chip,
  FadeUp,
  Scene,
  Kicker,
} from "./components";

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 1 — Intro: logo, wordmark, tagline
 * ═══════════════════════════════════════════════════════════════════════ */
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, mass: 0.9 } });
  const logoScale = interpolate(s, [0, 1], [0.5, 1]);
  const draw = interpolate(frame, [6, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(frame, [0, 44], [0, 0.95], {
    extrapolateRight: "clamp",
  });

  return (
    <Scene>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 36,
        }}
      >
        <div style={{ transform: `scale(${logoScale})` }}>
          <Logo size={156} draw={draw} glow={glow} />
        </div>
        <FadeUp delay={16}>
          <Wordmark size={108} />
        </FadeUp>
        <FadeUp delay={34}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 42,
              color: C.muted,
              maxWidth: 1180,
              lineHeight: 1.25,
            }}
          >
            The operating system for <Grad>your whole life.</Grad>
          </div>
        </FadeUp>
        <FadeUp delay={54}>
          <div
            style={{
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 24,
              color: C.faint,
              letterSpacing: "0.04em",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 9, background: C.sky }} />
            Local-first · private · yours
          </div>
        </FadeUp>
      </div>
    </Scene>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 2 — Everything in one app: a wrap of feature chips
 * ═══════════════════════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: <ListTodo size={24} />, label: "Tasks", color: C.terra },
  { icon: <Flame size={24} />, label: "Habits", color: C.gold },
  { icon: <NotebookPen size={24} />, label: "Notes", color: C.muted },
  { icon: <Wallet size={24} />, label: "Finance", color: C.gold },
  { icon: <Target size={24} />, label: "Goals", color: C.violet },
  { icon: <HeartPulse size={24} />, label: "Health", color: C.sky },
  { icon: <Shield size={24} />, label: "Vault", color: C.terra },
  { icon: <Sparkles size={24} />, label: "Ask AI", color: C.violet },
  { icon: <CalendarDays size={24} />, label: "Calendar", color: C.sky },
  { icon: <Waypoints size={24} />, label: "Connections", color: C.violet },
  { icon: <Music size={24} />, label: "Music", color: C.terra },
];

const GridScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Scene>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 52,
          textAlign: "center",
        }}
      >
        <FadeUp>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 82,
              letterSpacing: "-0.025em",
              color: C.ink,
            }}
          >
            Your whole life, <Grad>one app.</Grad>
          </div>
        </FadeUp>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 18,
            maxWidth: 1480,
          }}
        >
          {FEATURES.map((f, i) => {
            const s = spring({
              frame: frame - 14 - i * 3.5,
              fps,
              config: { damping: 15, mass: 0.6 },
              durationInFrames: 22,
            });
            return (
              <div
                key={f.label}
                style={{
                  opacity: s,
                  transform: `scale(${interpolate(s, [0, 1], [0.72, 1])})`,
                }}
              >
                <Chip icon={f.icon} label={f.label} color={f.color} />
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 3 — Finance, alive
 * ═══════════════════════════════════════════════════════════════════════ */
const SPARK = "M0,148 L66,120 L132,132 L198,86 L264,98 L330,52 L396,64 L462,26 L520,14";

const FinanceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const value = Math.round(
    interpolate(frame, [12, 72], [0, 182540], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }),
  );
  const drawP = interpolate(frame, [18, 78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const coins = [
    { i: <Coins size={22} />, n: "BTC", v: "+4.2%", c: C.gold },
    { i: <LineChart size={22} />, n: "AAPL", v: "+0.8%", c: C.sky },
  ];
  return (
    <Scene>
      <div style={{ display: "flex", alignItems: "center", gap: 80, width: "100%" }}>
        <div style={{ flex: 1 }}>
          <FadeUp>
            <Kicker color={C.gold}>Finance, alive</Kicker>
          </FadeUp>
          <FadeUp delay={6}>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 70,
                letterSpacing: "-0.025em",
                color: C.ink,
                marginTop: 18,
                lineHeight: 1.05,
              }}
            >
              Your net worth,
              <br />
              <Grad gradient={GRAD_COOL}>valued live.</Grad>
            </div>
          </FadeUp>
          <FadeUp delay={14}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 32,
                color: C.muted,
                marginTop: 22,
                maxWidth: 620,
                lineHeight: 1.35,
              }}
            >
              Live-valued crypto &amp; stocks, real FX, and a trend that draws
              itself.
            </div>
          </FadeUp>
        </div>
        <FadeUp delay={8} style={{ flex: 1 }}>
          <Glass pad={34}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 19,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.faint,
              }}
            >
              Net worth
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 76,
                color: C.ink,
                marginTop: 6,
                fontVariantNumeric: "tabular-nums",
                display: "flex",
                alignItems: "baseline",
                gap: 18,
              }}
            >
              ${value.toLocaleString("en-US")}
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: C.sage,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <TrendingUp size={24} /> +2.4%
              </span>
            </div>
            <svg viewBox="0 0 520 160" width="100%" height={140} style={{ marginTop: 14 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.gold} stopOpacity={0.42} />
                  <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={`${SPARK} L520,160 L0,160 Z`} fill="url(#sg)" opacity={drawP} />
              <path
                d={SPARK}
                fill="none"
                stroke={C.gold}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawP}
              />
            </svg>
            <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
              {coins.map((x, i) => (
                <FadeUp
                  key={x.n}
                  delay={40 + i * 8}
                  style={{ flex: 1 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${C.line}`,
                      fontFamily: FONT,
                    }}
                  >
                    <span style={{ color: x.c }}>{x.i}</span>
                    <span style={{ fontSize: 26, fontWeight: 600, color: C.ink }}>
                      {x.n}
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 24,
                        color: C.sage,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {x.v}
                    </span>
                  </div>
                </FadeUp>
              ))}
            </div>
          </Glass>
        </FadeUp>
      </div>
    </Scene>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 4 — Ask AI (agentic): a typed command + a result
 * ═══════════════════════════════════════════════════════════════════════ */
const CMD = "Remind me to call Henry tomorrow at 2pm";

const AskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const typedCount = Math.floor(
    interpolate(frame, [16, 70], [0, CMD.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const typed = CMD.slice(0, typedCount);
  const showResult = frame > 78;
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <Scene>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 46,
          textAlign: "center",
          width: "100%",
        }}
      >
        <FadeUp>
          <Kicker color={C.violet}>Agentic AI</Kicker>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 78,
              letterSpacing: "-0.025em",
              color: C.ink,
              marginTop: 16,
            }}
          >
            Ask in plain words — <Grad>it acts.</Grad>
          </div>
        </FadeUp>
        <FadeUp delay={10} style={{ width: "100%", maxWidth: 1080 }}>
          <Glass pad={36}>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 26,
                alignItems: "center",
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: 9, background: "#ff5f57" }} />
              <span style={{ width: 14, height: 14, borderRadius: 9, background: "#febc2e" }} />
              <span style={{ width: 14, height: 14, borderRadius: 9, background: "#28c840" }} />
              <span
                style={{
                  marginLeft: 12,
                  fontFamily: FONT,
                  fontSize: 20,
                  color: C.faint,
                }}
              >
                Ask my notes
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                textAlign: "left",
                minHeight: 120,
              }}
            >
              <Sparkles size={34} color={C.terra} style={{ marginTop: 6, flexShrink: 0 }} />
              <div
                style={{
                  fontFamily: FONT,
                  fontWeight: 500,
                  fontSize: 40,
                  color: C.ink,
                  lineHeight: 1.35,
                }}
              >
                {typed}
                <span
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: 40,
                    marginLeft: 4,
                    background: C.terra,
                    transform: "translateY(6px)",
                    opacity: !showResult && caretOn ? 1 : 0,
                  }}
                />
                {showResult && (
                  <div style={{ marginTop: 26 }}>
                    <ResultChip />
                  </div>
                )}
              </div>
            </div>
          </Glass>
        </FadeUp>
      </div>
    </Scene>
  );
};

const ResultChip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - 78,
    fps,
    config: { damping: 14, mass: 0.6 },
    durationInFrames: 18,
  });
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 22px",
        borderRadius: 14,
        background: "rgba(86,182,232,0.12)",
        border: "1px solid rgba(86,182,232,0.3)",
        opacity: s,
        transform: `translateY(${(1 - s) * 14}px)`,
      }}
    >
      <Check size={26} color={C.sky} />
      <span style={{ fontFamily: FONT, fontSize: 32, color: C.sky, fontWeight: 600 }}>
        Reminder set · Tomorrow 2:00 PM
      </span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 5 — Habits & focus: heatmap + timer ring
 * ═══════════════════════════════════════════════════════════════════════ */
const LIT = new Set([
  2, 3, 5, 8, 9, 10, 12, 15, 16, 17, 19, 22, 23, 24, 26, 27, 29, 30, 31, 33,
]);

const HabitsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const ringP = interpolate(frame, [18, 80], [0, 0.62], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const R = 92;
  const circ = 2 * Math.PI * R;
  return (
    <Scene>
      <div style={{ display: "flex", alignItems: "center", gap: 90, width: "100%" }}>
        <div style={{ flex: 1 }}>
          <FadeUp>
            <Kicker color={C.terra}>Habits &amp; focus</Kicker>
          </FadeUp>
          <FadeUp delay={6}>
            <div
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 70,
                letterSpacing: "-0.025em",
                color: C.ink,
                marginTop: 18,
                lineHeight: 1.05,
              }}
            >
              Build streaks.
              <br />
              <Grad>Stay focused.</Grad>
            </div>
          </FadeUp>
          <FadeUp delay={14}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 32,
                color: C.muted,
                marginTop: 22,
                maxWidth: 560,
                lineHeight: 1.35,
              }}
            >
              A year-long heatmap and a focus timer that knows exactly when
              you&apos;ll be done.
            </div>
          </FadeUp>
        </div>
        <FadeUp delay={8} style={{ flex: 1 }}>
          <Glass pad={40} style={{ display: "flex", alignItems: "center", gap: 44 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 9,
                flex: 1,
              }}
            >
              {Array.from({ length: 35 }).map((_, i) => {
                const on = LIT.has(i);
                const appear = interpolate(frame, [10 + i * 1.4, 18 + i * 1.4], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 7,
                      background: on
                        ? `color-mix(in oklab, ${C.terra} ${48 + (i % 4) * 16}%, transparent)`
                        : "rgba(255,255,255,0.05)",
                      opacity: appear,
                    }}
                  />
                );
              })}
            </div>
            <div style={{ position: "relative", width: 220, height: 220, flexShrink: 0 }}>
              <svg width={220} height={220} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={110} cy={110} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
                <circle
                  cx={110}
                  cy={110}
                  r={R}
                  fill="none"
                  stroke={C.terra}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - ringP)}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 44,
                  color: C.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                25:00
              </div>
            </div>
          </Glass>
        </FadeUp>
      </div>
    </Scene>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 6 — Private by design (vault)
 * ═══════════════════════════════════════════════════════════════════════ */
const VaultScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    { i: <KeyRound size={24} />, t: "GitHub" },
    { i: <CreditCard size={24} />, t: "Visa ·1234" },
    { i: <Lock size={24} />, t: "Recovery codes" },
  ];
  const lockS = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  return (
    <Scene>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          textAlign: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            transform: `scale(${interpolate(lockS, [0, 1], [0.6, 1])})`,
            display: "grid",
            placeItems: "center",
            width: 130,
            height: 130,
            borderRadius: 32,
            background: `color-mix(in oklab, ${C.terra} 16%, transparent)`,
            border: `1px solid ${C.line2}`,
            color: C.terra,
            boxShadow: `0 0 60px -8px ${C.terra}`,
          }}
        >
          <Lock size={62} strokeWidth={1.7} />
        </div>
        <FadeUp delay={10}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 78,
              letterSpacing: "-0.025em",
              color: C.ink,
            }}
          >
            Private <Grad>by design.</Grad>
          </div>
        </FadeUp>
        <FadeUp delay={16} style={{ width: "100%", maxWidth: 760 }}>
          <Glass pad={22}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rows.map((r, i) => (
                <FadeUp key={r.t} delay={20 + i * 7}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 22px",
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${C.line}`,
                      fontFamily: FONT,
                    }}
                  >
                    <span style={{ color: C.terra }}>{r.i}</span>
                    <span style={{ fontSize: 28, color: C.ink }}>{r.t}</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "monospace",
                        letterSpacing: 4,
                        fontSize: 28,
                        color: C.faint,
                      }}
                    >
                      ••••••
                    </span>
                  </div>
                </FadeUp>
              ))}
            </div>
          </Glass>
        </FadeUp>
        <FadeUp delay={40}>
          <div style={{ fontFamily: FONT, fontSize: 30, color: C.muted }}>
            Encrypted on your device · no servers · no tracking
          </div>
        </FadeUp>
      </div>
    </Scene>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Scene 7 — Outro CTA
 * ═══════════════════════════════════════════════════════════════════════ */
const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 13, mass: 0.9 } });
  return (
    <Scene>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 34,
        }}
      >
        <div style={{ transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})` }}>
          <Logo size={104} glow={0.9} />
        </div>
        <FadeUp delay={12}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 92,
              letterSpacing: "-0.03em",
              color: C.ink,
              lineHeight: 1.02,
              maxWidth: 1300,
            }}
          >
            Your life deserves <Grad>a better OS.</Grad>
          </div>
        </FadeUp>
        <FadeUp delay={26}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              marginTop: 8,
              padding: "18px 30px",
              borderRadius: 16,
              background: `linear-gradient(100deg, ${C.terra}, #d4823f)`,
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 30,
              color: "#fff",
              boxShadow: `0 24px 70px -28px ${C.terra}`,
            }}
          >
            <Logo size={30} glow={0} />
            github.com/ClaudevGuy/life-os
          </div>
        </FadeUp>
        <FadeUp delay={34}>
          <div style={{ fontFamily: FONT, fontSize: 25, color: C.faint, marginTop: 4 }}>
            life-os-tan-tau.vercel.app · Free &amp; open source
          </div>
        </FadeUp>
      </div>
    </Scene>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
 * Composition
 * ═══════════════════════════════════════════════════════════════════════ */
export const LifeOSIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <Bg />
      <Sequence from={0} durationInFrames={112}>
        <IntroScene />
      </Sequence>
      <Sequence from={98} durationInFrames={112}>
        <GridScene />
      </Sequence>
      <Sequence from={196} durationInFrames={118}>
        <FinanceScene />
      </Sequence>
      <Sequence from={300} durationInFrames={108}>
        <AskScene />
      </Sequence>
      <Sequence from={394} durationInFrames={102}>
        <HabitsScene />
      </Sequence>
      <Sequence from={482} durationInFrames={96}>
        <VaultScene />
      </Sequence>
      <Sequence from={564} durationInFrames={96}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
