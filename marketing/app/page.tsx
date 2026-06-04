"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Sparkles,
  Wallet,
  Shield,
  Target,
  HeartPulse,
  CalendarDays,
  ListTodo,
  Flame,
  NotebookPen,
  Users,
  CreditCard,
  Music,
  Command,
  Timer,
  Coins,
  LineChart,
  KeyRound,
  Lock,
  Zap,
  Layers,
  WifiOff,
  RefreshCw,
  Download,
  Check,
  ArrowRight,
  TrendingUp,
  Highlighter,
  FolderKanban,
  Bookmark,
  ChevronRight,
} from "lucide-react";

const GITHUB = "https://github.com/ClaudevGuy/life-os";

// ───────────────────────────────────────────────────────────────────────────
// Motion helpers
// ───────────────────────────────────────────────────────────────────────────

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`lp-reveal ${seen ? "lp-in" : ""} ${className ?? ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const dur = 1300;
          const start = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(eased * to));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

const ASK_LINES = [
  { cmd: "Remind me to call Henry tomorrow at 2pm", result: "Reminder set · Tomorrow 2:00 PM" },
  { cmd: "Add 0.5 BTC to my holdings", result: "Holding added · 0.5 BTC" },
  { cmd: "Add a savings account at Chase with $5,000", result: "Account added · $5,000" },
  { cmd: "Summarize what I captured this week", result: "12 items · synthesized" },
];

function AskDemo() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    const full = ASK_LINES[idx].cmd;
    let i = 0;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    setTyped("");
    setShowResult(false);
    const type = () => {
      if (cancelled) return;
      if (i <= full.length) {
        setTyped(full.slice(0, i));
        i++;
        timers.push(setTimeout(type, 34));
      } else {
        timers.push(setTimeout(() => !cancelled && setShowResult(true), 260));
        timers.push(
          setTimeout(() => !cancelled && setIdx((p) => (p + 1) % ASK_LINES.length), 2800),
        );
      }
    };
    timers.push(setTimeout(type, 300));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [idx]);

  return (
    <div className="lp-glass rounded-2xl p-4 sm:p-5 font-mono text-[13.5px]">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[11px]" style={{ color: "var(--lp-faint)" }}>
          Ask my notes
        </span>
      </div>
      <div className="flex items-start gap-2">
        <Sparkles size={15} style={{ color: "var(--lp-terra)", marginTop: 2 }} />
        <div className="min-h-[44px]">
          <span style={{ color: "var(--lp-ink)" }}>{typed}</span>
          <span className="lp-caret" />
          {showResult && (
            <div
              className="mt-2.5 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{
                background: "rgba(86,182,232,0.1)",
                border: "1px solid rgba(86,182,232,0.25)",
                animation: "lp-rise 0.4s ease both",
              }}
            >
              <Check size={13} style={{ color: "var(--lp-sky)" }} />
              <span style={{ color: "var(--lp-sky)" }}>{ASK_LINES[idx].result}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Data
// ───────────────────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: Shield,
    title: "Private by default",
    body: "Everything lives on your device — IndexedDB, not someone's cloud. Your vault is encrypted with AES-GCM. No accounts, no tracking, no servers.",
    color: "var(--lp-terra)",
  },
  {
    icon: Layers,
    title: "Your whole life, in one place",
    body: "Tasks, habits, health, goals, money, notes, people, an encrypted vault — 30+ tools that finally talk to each other, instead of ten scattered apps.",
    color: "var(--lp-gold)",
  },
  {
    icon: Sparkles,
    title: "AI that actually acts",
    body: "Ask in plain English and it does the work — sets reminders, logs holdings, adds people. Not another chatbot that just talks back.",
    color: "var(--lp-violet)",
  },
  {
    icon: Zap,
    title: "Fast & beautiful",
    body: "Local-first means instant. Every page is hand-crafted, animated, and a genuine pleasure to live in — light or dark.",
    color: "var(--lp-sky)",
  },
];

const EVERYTHING: { cat: string; icon: typeof Wallet; items: string[] }[] = [
  {
    cat: "Plan & do",
    icon: CalendarDays,
    items: [
      "Drag-and-drop customizable Today dashboard",
      "Calendar surfacing every dated item",
      "Per-day notes scratchpad",
      "Tasks with priorities & due dates",
      "Time-based reminders",
      "Habits with streaks & a GitHub-style heatmap",
      "Focus / Pomodoro timer with a daily goal",
      "Week-pulse momentum",
    ],
  },
  {
    cat: "Mind & body",
    icon: HeartPulse,
    items: [
      "Daily health check-ins — mood, energy, sleep, weight, water, activity",
      "Auto-charted health trends",
      "Identity-first Goals (Compass)",
      "Auto-rolling progress & milestones",
      "Weekly reviews",
      "Highlights that resurface",
    ],
  },
  {
    cat: "Money",
    icon: Wallet,
    items: [
      "Net worth across all accounts",
      "Live-valued crypto & stock holdings",
      "Asset-allocation donut",
      "True multi-currency with live FX",
      "Net-worth trend over time",
      "Subscriptions & renewal reminders",
      "Live market prices",
    ],
  },
  {
    cat: "Knowledge & people",
    icon: NotebookPen,
    items: [
      "Notes with formatting",
      "Bookmarks / reading list",
      "Files",
      "Inbox & quick capture",
      "People CRM",
      "Projects with GitHub links",
      "Tags & templates",
    ],
  },
  {
    cat: "Intelligence",
    icon: Sparkles,
    items: [
      "Ask your notes — agentic AI",
      "Adds reminders, tasks, people, accounts & holdings for you",
      "Command palette (⌘K)",
      "YouTube Music with a persistent mini-player",
    ],
  },
  {
    cat: "Private by design",
    icon: Shield,
    items: [
      "Encrypted Vault (AES-GCM, PBKDF2)",
      "Whole-app passcode lock",
      "100% local-first (IndexedDB)",
      "Works fully offline",
      "Import / export all your data",
      "Trash & restore",
      "Optional cross-device sync",
      "Light & dark themes",
      "Installable as a PWA",
    ],
  },
];

function BentoCard({
  icon: Icon,
  title,
  body,
  color,
  wide,
  visual,
}: {
  icon: typeof Wallet;
  title: string;
  body: string;
  color: string;
  wide?: boolean;
  visual: ReactNode;
}) {
  const text = (
    <div className="relative">
      <span
        className="grid place-items-center w-11 h-11 rounded-xl mb-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 50%, #15131f))`,
          boxShadow: `0 12px 28px -12px ${color}`,
        }}
      >
        <Icon size={20} />
      </span>
      <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--lp-muted)" }}>
        {body}
      </p>
    </div>
  );
  return (
    <div className="lp-card lp-card-glow h-full p-6 overflow-hidden relative">
      <span
        aria-hidden
        className="absolute -right-10 -top-10 w-36 h-36 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, color-mix(in oklch, ${color} 32%, transparent), transparent 70%)` }}
      />
      {wide ? (
        <div className="relative grid sm:grid-cols-[1.05fr_1fr] gap-6 items-center h-full">
          {text}
          <div>{visual}</div>
        </div>
      ) : (
        <div className="relative flex flex-col h-full">
          {text}
          <div className="mt-5">{visual}</div>
        </div>
      )}
    </div>
  );
}

function BentoFinance() {
  return (
    <div className="lp-glass rounded-xl p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Net worth</div>
          <div className="text-[21px] font-semibold tabular-nums">$182,540</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "#7fd0a6" }}>
          <TrendingUp size={13} /> +2.4%
        </span>
      </div>
      <Spark />
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {[
          { i: Coins, n: "BTC", v: "+4.2%", c: "var(--lp-gold)" },
          { i: LineChart, n: "AAPL", v: "+0.8%", c: "var(--lp-sky)" },
        ].map((x) => (
          <div key={x.n} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <x.i size={13} style={{ color: x.c }} />
            <span className="text-[11.5px]">{x.n}</span>
            <span className="ml-auto text-[11px] tabular-nums" style={{ color: "var(--lp-muted)" }}>{x.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoVault() {
  return (
    <div className="space-y-2">
      {[
        { i: KeyRound, t: "GitHub" },
        { i: CreditCard, t: "Visa ·1234" },
        { i: Lock, t: "Recovery codes" },
      ].map((x) => (
        <div key={x.t} className="lp-glass rounded-lg px-3 py-2 flex items-center gap-2.5">
          <x.i size={14} style={{ color: "var(--lp-terra)" }} />
          <span className="text-[12.5px]">{x.t}</span>
          <span className="ml-auto font-mono text-[12px] tracking-widest" style={{ color: "var(--lp-faint)" }}>••••••</span>
        </div>
      ))}
    </div>
  );
}

function BentoMood() {
  return (
    <div className="flex items-end justify-between gap-1.5 h-16">
      {[3, 4, 2, 4, 5, 4, 5].map((v, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: `${v * 18}%`,
            background: "linear-gradient(to top, var(--lp-sky), color-mix(in oklch, var(--lp-violet) 60%, var(--lp-sky)))",
            opacity: 0.55 + v * 0.09,
          }}
        />
      ))}
    </div>
  );
}

function BentoRing({ pct, color, size = 86, stroke = 8 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[17px] font-semibold tabular-nums">{pct}%</div>
    </div>
  );
}

function BentoGoal() {
  return (
    <div className="flex items-center gap-4">
      <BentoRing pct={72} color="var(--lp-violet)" />
      <div className="text-[12.5px]" style={{ color: "var(--lp-muted)" }}>
        <div style={{ color: "var(--lp-ink)" }} className="font-medium">Half-marathon</div>
        <div>8 / 11 long runs</div>
      </div>
    </div>
  );
}

function BentoHabits() {
  const lit = [2, 3, 5, 8, 9, 10, 12, 15, 16, 17, 19, 22, 23, 24, 26, 29, 30, 31, 33];
  const C = 2 * Math.PI * 32;
  return (
    <div className="flex items-center gap-5">
      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[3px]"
            style={{
              background: lit.includes(i)
                ? `color-mix(in oklch, var(--lp-terra) ${42 + (i % 4) * 16}%, transparent)`
                : "rgba(255,255,255,0.05)",
            }}
          />
        ))}
      </div>
      <div className="relative grid place-items-center shrink-0" style={{ width: 74, height: 74 }}>
        <svg width={74} height={74} className="-rotate-90">
          <circle cx={37} cy={37} r={32} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
          <circle cx={37} cy={37} r={32} fill="none" stroke="var(--lp-terra)" strokeWidth={5} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * 0.4} />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-mono text-[13px] tabular-nums">25:00</div>
      </div>
    </div>
  );
}

function BentoAsk() {
  return (
    <div className="lp-glass rounded-xl p-3.5 font-mono text-[12.5px]">
      <div className="flex items-center gap-2" style={{ color: "var(--lp-muted)" }}>
        <Sparkles size={13} style={{ color: "var(--lp-terra)" }} />
        Add 0.5 BTC to holdings
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "rgba(86,182,232,0.1)", border: "1px solid rgba(86,182,232,0.25)" }}>
        <Check size={12} style={{ color: "var(--lp-sky)" }} />
        <span style={{ color: "var(--lp-sky)" }}>Holding added</span>
      </div>
    </div>
  );
}

function BentoMusic() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg shrink-0" style={{ background: "linear-gradient(135deg, var(--lp-terra), var(--lp-violet))" }} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium truncate">Now playing</div>
        <div className="text-[11px] truncate" style={{ color: "var(--lp-muted)" }}>YouTube Music · in-app</div>
      </div>
      <span className="flex items-end gap-[3px] h-6">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="w-[3px] rounded-full lp-eq" style={{ background: "var(--lp-terra)", height: "100%", animationDelay: `${i * 0.15}s` }} />
        ))}
      </span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Page
// ───────────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <Pillars />
      <Bento />
      <DeepDives />
      <Everything />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center w-8 h-8 rounded-[9px] text-white"
        style={{
          background: "linear-gradient(135deg, var(--lp-terra), var(--lp-violet))",
          boxShadow: "0 6px 20px -6px rgba(226,103,74,0.6)",
        }}
      >
        <Sparkles size={16} />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em]">
        Life<span style={{ color: "var(--lp-terra)" }}>·</span>OS
      </span>
    </span>
  );
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50">
      <div className="lp-glass border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-7 text-[14px]" style={{ color: "var(--lp-muted)" }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#ai" className="hover:text-white transition-colors">AI</a>
            <a href="#private" className="hover:text-white transition-colors">Private</a>
            <a href="#everything" className="hover:text-white transition-colors">Everything</a>
          </div>
          <Link href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-primary !px-4 !py-2 !text-[13.5px]">
            Get it on GitHub
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const ref = useRef<HTMLElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--lp-mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--lp-my", `${e.clientY - r.top}px`);
  }
  return (
    <section ref={ref} onMouseMove={onMove} className="relative overflow-hidden">
      {/* ambient */}
      <div className="lp-grid" />
      <div className="lp-floor" />
      <div
        className="lp-blob lp-anim-drift"
        style={{ top: -120, left: -80, width: 460, height: 460, background: "var(--lp-terra)" }}
      />
      <div
        className="lp-blob lp-anim-drift"
        style={{ top: 40, right: -120, width: 420, height: 420, background: "var(--lp-violet)", animationDelay: "-6s" }}
      />
      <div
        className="lp-blob lp-anim-drift"
        style={{ bottom: -160, left: "40%", width: 380, height: 380, background: "var(--lp-sky)", opacity: 0.35, animationDelay: "-11s" }}
      />
      <div className="lp-spotlight" />
      <div className="lp-noise" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-16 sm:pt-24 pb-20">
        <div className="lp-hero-in max-w-3xl">
          <span className="lp-chip">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--lp-sky)", boxShadow: "0 0 8px var(--lp-sky)" }} />
            Local-first · private · v1.0
          </span>
          <h1 className="mt-6 text-[44px] sm:text-[68px] leading-[1.02] font-semibold tracking-[-0.03em]">
            The operating system
            <br />
            for <span className="lp-grad">your entire life.</span>
          </h1>
          <p className="mt-6 text-[17px] sm:text-[19px] leading-relaxed max-w-2xl" style={{ color: "var(--lp-muted)" }}>
            Plan your day, build habits, track your health, manage your money, lock away your
            secrets, and ask an AI that actually does the work — all in one beautiful app that
            runs on <span style={{ color: "var(--lp-ink)" }}>your device</span>, not someone&apos;s cloud.
          </p>
          <div className="mt-9 flex items-center gap-3 flex-wrap">
            <Link href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-primary">
              Get Life OS
              <ArrowRight size={17} />
            </Link>
            <a href="#features" className="lp-btn lp-btn-ghost">
              Explore features
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6 sm:gap-9 flex-wrap text-[13px]" style={{ color: "var(--lp-faint)" }}>
            <Stat value={<Counter to={30} suffix="+" />} label="tools, one app" />
            <Stat value={<Counter to={100} suffix="%" />} label="on your device" />
            <Stat value="0" label="servers · trackers" />
            <Stat value="AES-256" label="encrypted vault" />
          </div>
        </div>

        {/* Floating preview */}
        <div className="mt-14 sm:mt-20 relative">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="text-[22px] font-semibold tabular-nums" style={{ color: "var(--lp-ink)" }}>
        {value}
      </div>
      <div className="uppercase tracking-[0.12em] text-[10.5px] mt-0.5">{label}</div>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      {/* main glass panel */}
      <div className="lp-card lp-anim-float-slow max-w-3xl mx-auto p-5 sm:p-6" style={{ boxShadow: "0 40px 120px -40px rgba(139,124,240,0.5)" }}>
        <div className="flex items-center gap-1.5 mb-5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-line-2)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-line-2)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-line-2)" }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* net worth */}
          <div className="lp-glass rounded-xl p-4 col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Net worth</div>
            <div className="mt-1 text-[24px] font-semibold tabular-nums">$182,540</div>
            <Spark />
          </div>
          {/* habits */}
          <div className="lp-glass rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Habits</div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: [3, 4, 5, 8, 9, 11, 12, 15, 16, 17, 18, 22, 23, 25, 26, 27].includes(i)
                      ? `color-mix(in oklch, var(--lp-terra) ${40 + (i % 4) * 18}%, transparent)`
                      : "rgba(255,255,255,0.06)",
                  }}
                />
              ))}
            </div>
          </div>
          {/* mood */}
          <div className="lp-glass rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Mood · 7d</div>
            <div className="mt-3 flex items-end justify-between h-9 gap-1">
              {[3, 4, 2, 4, 5, 4, 5].map((v, i) => (
                <span key={i} className="flex-1 rounded-full" style={{ height: `${v * 18}%`, background: "var(--lp-sky)", opacity: 0.5 + v * 0.1 }} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <AskDemo />
        </div>
      </div>

      {/* floating accent chips */}
      <div className="hidden sm:block absolute -left-2 sm:left-6 top-10 lp-anim-float" style={{ animationDelay: "-1.5s" }}>
        <div className="lp-glass rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <Coins size={15} style={{ color: "var(--lp-gold)" }} />
          <span className="text-[12.5px]">BTC <b style={{ color: "var(--lp-ink)" }}>+4.2%</b></span>
        </div>
      </div>
      <div className="hidden sm:block absolute right-2 sm:right-8 top-24 lp-anim-float" style={{ animationDelay: "-3s" }}>
        <div className="lp-glass rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <Lock size={14} style={{ color: "var(--lp-terra)" }} />
          <span className="text-[12.5px]">Vault locked</span>
        </div>
      </div>
      <div className="hidden sm:block absolute right-10 -bottom-3 lp-anim-float" style={{ animationDelay: "-4.5s" }}>
        <div className="lp-glass rounded-xl px-3.5 py-2.5 flex items-center gap-2">
          <Flame size={15} style={{ color: "var(--lp-terra)" }} fill="var(--lp-terra)" />
          <span className="text-[12.5px]">14-day streak</span>
        </div>
      </div>
    </div>
  );
}

function Spark() {
  return (
    <svg viewBox="0 0 120 32" className="w-full h-8 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lpspk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lp-gold)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--lp-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,26 L18,22 L34,24 L52,14 L70,17 L88,8 L106,11 L120,4 L120,32 L0,32 Z" fill="url(#lpspk)" />
      <path d="M0,26 L18,22 L34,24 L52,14 L70,17 L88,8 L106,11 L120,4" fill="none" stroke="var(--lp-gold)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const MARQUEE_TAGS = [
  "Today dashboard", "Calendar", "Tasks", "Reminders", "Habits", "Focus timer",
  "Health", "Goals", "Reviews", "Highlights", "Net worth", "Holdings", "Markets",
  "Subscriptions", "Notes", "Bookmarks", "Files", "Inbox", "People", "Projects",
  "Tags", "Templates", "Ask AI", "Command palette", "Music", "Encrypted vault",
  "App lock", "Offline", "Sync", "Import / Export",
];

function Marquee() {
  return (
    <div className="py-8 border-y" style={{ borderColor: "var(--lp-line)" }}>
      <div className="lp-marquee-mask overflow-hidden">
        <div className="lp-marquee gap-3">
          {[...MARQUEE_TAGS, ...MARQUEE_TAGS].map((t, i) => (
            <span key={i} className="lp-chip">
              <Check size={12} style={{ color: "var(--lp-terra)" }} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: ReactNode;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="lp-chip" style={{ color: "var(--lp-terra)" }}>{kicker}</div>
      <h2 className="mt-4 text-[32px] sm:text-[44px] font-semibold tracking-[-0.025em] leading-[1.05]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[16px] leading-relaxed" style={{ color: "var(--lp-muted)" }}>{sub}</p>}
    </div>
  );
}

function Pillars() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 py-24">
      <Reveal>
        <SectionHead
          kicker="Why Life OS"
          title={<>Ten apps&apos; worth of life, <span className="lp-grad-cool">finally together.</span></>}
          sub="Most tools own one slice of your life and a piece of your data. Life OS owns none of it — and connects all of it."
        />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PILLARS.map((p, i) => (
          <Reveal key={p.title} delay={i * 80}>
            <div className="lp-card lp-card-glow h-full p-6">
              <span
                className="grid place-items-center w-11 h-11 rounded-xl mb-4"
                style={{ background: `color-mix(in oklch, ${p.color} 18%, transparent)`, color: p.color }}
              >
                <p.icon size={20} />
              </span>
              <h3 className="text-[17px] font-semibold">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--lp-muted)" }}>
                {p.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Bento() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-5 sm:px-6 py-20">
      <Reveal>
        <SectionHead
          kicker="The toolkit"
          title={<>Everything you run your life with, <span className="lp-grad">crafted to perfection.</span></>}
          sub="Not a wall of features — a set of tools that each feel hand-built, and quietly work together."
        />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Reveal className="sm:col-span-2">
          <BentoCard wide icon={Wallet} color="var(--lp-gold)" title="Finance that's alive" body="Net worth, live-valued crypto & stocks, allocation, and a trend that draws itself — all in your base currency." visual={<BentoFinance />} />
        </Reveal>
        <Reveal delay={70}>
          <BentoCard icon={Shield} color="var(--lp-terra)" title="An encrypted vault" body="Logins, cards, recovery codes — sealed with a passcode only you hold." visual={<BentoVault />} />
        </Reveal>
        <Reveal delay={70} className="sm:col-span-2">
          <BentoCard wide icon={Flame} color="var(--lp-terra)" title="Habits & focus" body="Streaks, a year-long heatmap, and a focus timer that knows exactly when you'll be done." visual={<BentoHabits />} />
        </Reveal>
        <Reveal delay={140}>
          <BentoCard icon={Target} color="var(--lp-violet)" title="Goals that track themselves" body="Tie a goal to who you're becoming; progress rolls up on its own." visual={<BentoGoal />} />
        </Reveal>
        <Reveal delay={70}>
          <BentoCard icon={HeartPulse} color="var(--lp-sky)" title="Body & mind" body="Mood, energy, sleep, weight — charted into patterns you can act on." visual={<BentoMood />} />
        </Reveal>
        <Reveal delay={140}>
          <BentoCard icon={Sparkles} color="var(--lp-violet)" title="AI that acts" body="Ask in plain words — it does the work and confirms, instead of just chatting." visual={<BentoAsk />} />
        </Reveal>
        <Reveal delay={210}>
          <BentoCard icon={Music} color="var(--lp-terra)" title="Music, built in" body="Your YouTube Music, with a player that follows you across the app." visual={<BentoMusic />} />
        </Reveal>
      </div>
    </section>
  );
}

function DeepDives() {
  return (
    <div className="space-y-4">
      <DeepDive
        id="ai"
        kicker="Agentic AI"
        title={<>An assistant that <span className="lp-grad">does</span>, not just talks.</>}
        body="Type what you want in plain English. Life OS reads your notes for context and takes the action — setting reminders, logging holdings, adding people, saving bookmarks — then confirms it. No copy-paste, no busywork."
        points={["Reads your own notes for context", "Adds reminders, tasks, people, accounts & holdings", "Streams answers with sources you can click"]}
        visual={<AskDemo />}
        flip={false}
      />
      <DeepDive
        id="money"
        kicker="Finance, alive"
        title={<>Your whole net worth, <span className="lp-grad-cool">valued live.</span></>}
        body="Accounts, crypto and stocks valued by the minute, an allocation donut, and a net-worth trend that draws itself — all converted into your base currency with real exchange rates. Read-only, nothing leaves your machine."
        points={["Live crypto & stock holdings", "Multi-currency with real FX", "Net-worth trend & allocation"]}
        visual={<FinanceVisual />}
        flip
      />
      <DeepDive
        id="private"
        kicker="Private by design"
        title={<>A vault only <span className="lp-grad">you</span> can open.</>}
        body="Passwords, cards, recovery codes — encrypted on your device with a key derived from your passcode (PBKDF2 + AES-GCM). Reading the database directly reveals only ciphertext. Lock the whole app behind it, too."
        points={["AES-GCM encryption at rest", "Passcode never stored — only verified", "Optional whole-app lock"]}
        visual={<VaultVisual />}
        flip={false}
      />
    </div>
  );
}

function DeepDive({
  id,
  kicker,
  title,
  body,
  points,
  visual,
  flip,
}: {
  id: string;
  kicker: string;
  title: ReactNode;
  body: string;
  points: string[];
  visual: ReactNode;
  flip: boolean;
}) {
  return (
    <section id={id} className="max-w-6xl mx-auto px-5 sm:px-6 py-16">
      <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center`}>
        <Reveal className={flip ? "lg:order-2" : ""}>
          <div className="lp-chip" style={{ color: "var(--lp-terra)" }}>{kicker}</div>
          <h2 className="mt-4 text-[30px] sm:text-[40px] font-semibold tracking-[-0.025em] leading-[1.08]">
            {title}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed" style={{ color: "var(--lp-muted)" }}>{body}</p>
          <ul className="mt-6 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[14.5px]">
                <span className="grid place-items-center w-5 h-5 rounded-full shrink-0" style={{ background: "color-mix(in oklch, var(--lp-terra) 20%, transparent)", color: "var(--lp-terra)" }}>
                  <Check size={12} strokeWidth={3} />
                </span>
                <span style={{ color: "var(--lp-ink)" }}>{p}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={120} className={flip ? "lg:order-1" : ""}>
          {visual}
        </Reveal>
      </div>
    </section>
  );
}

function FinanceVisual() {
  return (
    <div className="lp-card p-6 lp-anim-float-slow">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Net worth · USD</div>
          <div className="mt-1 text-[34px] font-semibold tabular-nums">$182,540</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#7fd0a6" }}>
          <TrendingUp size={14} /> +2.4%
        </span>
      </div>
      <Spark />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {[
          { i: Coins, n: "BTC", v: "+4.2%", c: "var(--lp-gold)" },
          { i: LineChart, n: "AAPL", v: "+0.8%", c: "var(--lp-sky)" },
          { i: Wallet, n: "Cash", v: "$24,000", c: "var(--lp-violet)" },
          { i: CreditCard, n: "Subs", v: "$92/mo", c: "var(--lp-terra)" },
        ].map((x) => (
          <div key={x.n} className="lp-glass rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <x.i size={15} style={{ color: x.c }} />
            <span className="text-[13px]">{x.n}</span>
            <span className="ml-auto text-[12.5px] tabular-nums" style={{ color: "var(--lp-muted)" }}>{x.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VaultVisual() {
  return (
    <div className="lp-card p-8 lp-anim-float-slow text-center">
      <div
        className="mx-auto grid place-items-center w-16 h-16 rounded-2xl mb-5"
        style={{ background: "color-mix(in oklch, var(--lp-terra) 16%, transparent)", color: "var(--lp-terra)", boxShadow: "0 0 40px -8px rgba(226,103,74,0.6)" }}
      >
        <KeyRound size={28} />
      </div>
      <div className="space-y-2.5 max-w-[260px] mx-auto text-left">
        {[
          { i: KeyRound, t: "GitHub" },
          { i: CreditCard, t: "Visa ·1234" },
          { i: Lock, t: "2FA recovery codes" },
        ].map((x) => (
          <div key={x.t} className="lp-glass rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <x.i size={15} style={{ color: "var(--lp-terra)" }} />
            <span className="text-[13px]">{x.t}</span>
            <span className="ml-auto font-mono text-[13px] tracking-widest" style={{ color: "var(--lp-faint)" }}>••••••</span>
          </div>
        ))}
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 text-[12px]" style={{ color: "var(--lp-muted)" }}>
        <Shield size={13} style={{ color: "#7fd0a6" }} /> Encrypted on this device · never synced
      </div>
    </div>
  );
}

function Everything() {
  return (
    <section id="everything" className="max-w-6xl mx-auto px-5 sm:px-6 py-24">
      <Reveal>
        <SectionHead
          kicker="Everything included"
          title={<>One purchase of your attention. <span className="lp-grad">Every tool below.</span></>}
          sub="No add-ons, no upsells, no per-feature paywall. It's all here, and it's all yours."
        />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EVERYTHING.map((g, i) => (
          <Reveal key={g.cat} delay={i * 60}>
            <div className="lp-card h-full p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="grid place-items-center w-9 h-9 rounded-[10px]" style={{ background: "rgba(255,255,255,0.05)", color: "var(--lp-terra)" }}>
                  <g.icon size={17} />
                </span>
                <h3 className="text-[15px] font-semibold uppercase tracking-[0.08em]">{g.cat}</h3>
              </div>
              <ul className="space-y-2.5">
                {g.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-[13.5px] leading-snug" style={{ color: "var(--lp-muted)" }}>
                    <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--lp-terra)" }} strokeWidth={2.5} />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>

      {/* tiny feature ribbon */}
      <Reveal>
        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {[Command, Timer, Music, RefreshCw, WifiOff, Download, Highlighter, FolderKanban, Bookmark, Users, ListTodo, Flame].map((I, i) => (
            <span key={i} className="grid place-items-center w-10 h-10 rounded-xl lp-glass" style={{ color: "var(--lp-muted)" }}>
              <I size={17} />
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-28">
      <Reveal>
        <div className="lp-card relative overflow-hidden text-center px-6 py-16 sm:py-20">
          <div className="lp-blob lp-anim-drift" style={{ top: -100, left: "20%", width: 360, height: 360, background: "var(--lp-terra)", opacity: 0.4 }} />
          <div className="lp-blob lp-anim-drift" style={{ bottom: -120, right: "15%", width: 340, height: 340, background: "var(--lp-violet)", opacity: 0.4, animationDelay: "-7s" }} />
          <div className="lp-grid" />
          <div className="relative">
            <h2 className="text-[34px] sm:text-[52px] font-semibold tracking-[-0.03em] leading-[1.04] max-w-3xl mx-auto">
              Your life deserves <span className="lp-grad">a better OS.</span>
            </h2>
            <p className="mt-5 text-[17px] max-w-xl mx-auto" style={{ color: "var(--lp-muted)" }}>
              Private. Local. Beautiful. Everything in one place — and it opens instantly.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <Link href={GITHUB} target="_blank" rel="noreferrer" className="lp-btn lp-btn-primary !text-[16px] !px-7 !py-4">
                Get Life OS
                <ChevronRight size={18} />
              </Link>
              <a href="#everything" className="lp-btn lp-btn-ghost !px-6 !py-4">
                See everything
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-5 flex-wrap text-[12.5px]" style={{ color: "var(--lp-faint)" }}>
              <span className="inline-flex items-center gap-1.5"><WifiOff size={13} /> Works offline</span>
              <span className="inline-flex items-center gap-1.5"><Shield size={13} /> No account needed</span>
              <span className="inline-flex items-center gap-1.5"><Zap size={13} /> Instant</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: "var(--lp-line)" }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo />
        <div className="text-[13px]" style={{ color: "var(--lp-faint)" }}>
          Local-first · built with care · v1.0
        </div>
        <Link href={GITHUB} target="_blank" rel="noreferrer" className="text-[13.5px] inline-flex items-center gap-1.5 hover:text-white transition-colors" style={{ color: "var(--lp-muted)" }}>
          View on GitHub <ArrowRight size={14} />
        </Link>
      </div>
    </footer>
  );
}
