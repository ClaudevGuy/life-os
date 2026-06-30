"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Sparkles,
  Wallet,
  Shield,
  Target,
  PenTool,
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
  Bell,
  Mic,
  Palette,
  FolderDown,
  Sun,
  Cloud,
  Moon,
  Inbox,
  Search,
  MessagesSquare,
} from "lucide-react";

// lucide-react dropped brand/logo icons (no `Github` export in this version) —
// a tiny inline mark is simpler than pulling in a whole icon-set dependency.
function Github({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.3 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.02 2.89-.02 3.29 0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

const GITHUB = "https://github.com/ClaudevGuy/life-os";
// Always points at whichever release is current — the filename is fixed
// across releases (see package.json `build.win.artifactName`), so this link
// never needs to change when a new version ships.
const DOWNLOAD_WINDOWS =
  "https://github.com/ClaudevGuy/life-os/releases/latest/download/Life-OS-Setup.exe";

// ───────────────────────────────────────────────────────────────────────────
// Theme — mirrors the app's light / cloudy / dark system (data-theme on <html>)
// ───────────────────────────────────────────────────────────────────────────

const THEME_ORDER = ["light", "cloudy", "dark"] as const;
type LpTheme = (typeof THEME_ORDER)[number];
const THEME_ICON: Record<LpTheme, typeof Sun> = { light: Sun, cloudy: Cloud, dark: Moon };
const THEME_LABEL: Record<LpTheme, string> = { light: "Light", cloudy: "Cloudy", dark: "Dark" };

function useTheme(): [LpTheme, () => void] {
  const [theme, setTheme] = useState<LpTheme>("light");
  useEffect(() => {
    const t = document.documentElement.dataset.theme as LpTheme | undefined;
    if (t && THEME_ORDER.includes(t)) setTheme(t);
  }, []);
  function cycle() {
    setTheme((cur) => {
      const next = THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % THEME_ORDER.length];
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("lifeos.landing.theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }
  return [theme, cycle];
}

function ThemeToggle() {
  const [theme, cycle] = useTheme();
  const Icon = THEME_ICON[theme];
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${THEME_LABEL[theme]} — switch to ${THEME_LABEL[next]}`}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[next]}.`}
      className="grid place-items-center w-9 h-9 rounded-[10px] transition-transform active:scale-95"
      style={{ border: "1px solid var(--lp-line-2)", background: "var(--lp-card)", color: "var(--lp-terra)" }}
    >
      <Icon size={16} />
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Motion helpers
// ───────────────────────────────────────────────────────────────────────────

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
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
    <div ref={ref} className={`lp-reveal ${seen ? "lp-in" : ""} ${className ?? ""}`} style={{ transitionDelay: `${delay}ms` }}>
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
        timers.push(setTimeout(() => !cancelled && setIdx((p) => (p + 1) % ASK_LINES.length), 2800));
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
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
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
                background: "color-mix(in oklch, var(--lp-sky) 14%, transparent)",
                border: "1px solid color-mix(in oklch, var(--lp-sky) 30%, transparent)",
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

// soft tinted surface used inside mockups (theme-aware)
const TINT = "color-mix(in oklch, var(--lp-line) 60%, transparent)";

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
    body: "Notes, a whiteboard, tasks, habits, goals, money, people, your inbox, an encrypted vault — tools that finally talk to each other instead of ten scattered apps.",
    color: "var(--lp-gold)",
  },
  {
    icon: Sparkles,
    title: "AI that actually acts",
    body: "Ask in plain English and it does the work — sets reminders, logs holdings, adds people. Not another chatbot that just talks back.",
    color: "var(--lp-violet)",
  },
  {
    icon: Palette,
    title: "Beautiful & themeable",
    body: "Local-first means instant. Every page is hand-crafted and a pleasure to live in — in warm light, frosted cloudy glass, or dark.",
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
    cat: "Capture",
    icon: NotebookPen,
    items: [
      "Notes — markdown, [[wiki-links]] & paste-to-attach images",
      "Whiteboard — a single infinite Excalidraw canvas",
      "Bookmarks / reading list",
      "Files — PDFs, docs, images",
      "Inbox & quick capture",
      "Tags",
    ],
  },
  {
    cat: "Reflect & grow",
    icon: Target,
    items: [
      "Identity-first Goals with auto-rolling progress",
      "Milestones & metrics",
      "Weekly reviews",
      "Highlights that resurface",
      "Projects with GitHub links & KPIs",
    ],
  },
  {
    cat: "Money",
    icon: Wallet,
    items: [
      "Net worth across all accounts",
      "Live-valued crypto & stock holdings",
      "On-chain wallet balances",
      "Asset-allocation donut",
      "True multi-currency with live FX",
      "Net-worth trend over time",
      "Subscriptions & renewal reminders",
    ],
  },
  {
    cat: "Connect & ask",
    icon: Sparkles,
    items: [
      "People CRM with a backlinks timeline",
      "Messages — your Gmail inbox, unified",
      "Ask your notes — agentic AI",
      "Voice capture — speak to add anything",
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
      "Local reminders & notifications",
      "Automatic backups to a folder",
      "Full backup & restore (incl. vault)",
      "Trash & restore",
      "Optional cross-device sync",
      "Light · cloudy · dark themes",
      "Installable as a PWA",
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Bento mockups (all theme-aware via --lp-* tokens)
// ───────────────────────────────────────────────────────────────────────────

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
          background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 55%, #15131f))`,
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
        style={{ background: `radial-gradient(circle, color-mix(in oklch, ${color} 28%, transparent), transparent 70%)` }}
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

function BentoFinance() {
  return (
    <div className="lp-glass rounded-xl p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Net worth</div>
          <div className="text-[21px] font-semibold tabular-nums">$182,540</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "var(--lp-sage)" }}>
          <TrendingUp size={13} /> +2.4%
        </span>
      </div>
      <Spark />
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        {[
          { i: Coins, n: "BTC", v: "+4.2%", c: "var(--lp-gold)" },
          { i: LineChart, n: "AAPL", v: "+0.8%", c: "var(--lp-sky)" },
        ].map((x) => (
          <div key={x.n} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: TINT }}>
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

function BentoNotes() {
  const notes = [
    { t: "Trip to Japan", c: "var(--lp-terra)" },
    { t: "Book notes", c: "var(--lp-gold)" },
    { t: "Recipes", c: "var(--lp-sage)" },
    { t: "Project ideas", c: "var(--lp-sky)" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {notes.map((n) => (
        <div key={n.t} className="lp-glass rounded-lg p-2.5">
          <span className="block w-6 h-1.5 rounded-full mb-2" style={{ background: n.c }} />
          <div className="text-[12px] font-medium truncate">{n.t}</div>
          <div className="mt-1 space-y-1">
            <span className="block h-1 rounded-full" style={{ background: TINT, width: "90%" }} />
            <span className="block h-1 rounded-full" style={{ background: TINT, width: "60%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BentoWhiteboard() {
  return (
    <div className="lp-glass rounded-xl p-3 relative overflow-hidden" style={{ height: 116 }}>
      <span className="absolute rounded-md" style={{ left: 14, top: 16, width: 56, height: 38, background: "color-mix(in oklch, var(--lp-sky) 30%, transparent)", border: "1.5px solid var(--lp-sky)" }} />
      <span className="absolute rounded-full" style={{ right: 18, top: 22, width: 46, height: 46, background: "color-mix(in oklch, var(--lp-sage) 30%, transparent)", border: "1.5px solid var(--lp-sage)" }} />
      <span className="absolute" style={{ left: 40, bottom: 16, width: 44, height: 30, background: "color-mix(in oklch, var(--lp-gold) 30%, transparent)", border: "1.5px solid var(--lp-gold)", transform: "rotate(45deg)" }} />
      <svg className="absolute" style={{ left: 64, top: 34 }} width="60" height="40">
        <path d="M2 30 C 20 4, 40 4, 56 22" fill="none" stroke="var(--lp-terra)" strokeWidth="1.8" />
        <path d="M50 16 L57 23 L48 25 Z" fill="var(--lp-terra)" />
      </svg>
    </div>
  );
}

function BentoMessages() {
  const msgs = [
    { n: "Maya", s: "Lunch on Friday?", c: "var(--lp-terra)" },
    { n: "Acme Bank", s: "Your statement is ready", c: "var(--lp-violet)" },
    { n: "Design Team", s: "Standup at 10", c: "var(--lp-sky)" },
  ];
  return (
    <div className="space-y-2">
      {msgs.map((m) => (
        <div key={m.n} className="lp-glass rounded-lg px-2.5 py-2 flex items-center gap-2.5">
          <span className="grid place-items-center w-7 h-7 rounded-full text-[11px] font-semibold text-white shrink-0" style={{ background: m.c }}>
            {m.n[0]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium truncate">{m.n}</div>
            <div className="text-[11px] truncate" style={{ color: "var(--lp-muted)" }}>{m.s}</div>
          </div>
        </div>
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TINT} strokeWidth={stroke} />
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
            style={{ background: lit.includes(i) ? `color-mix(in oklch, var(--lp-terra) ${42 + (i % 4) * 16}%, transparent)` : TINT }}
          />
        ))}
      </div>
      <div className="relative grid place-items-center shrink-0" style={{ width: 74, height: 74 }}>
        <svg width={74} height={74} className="-rotate-90">
          <circle cx={37} cy={37} r={32} fill="none" stroke={TINT} strokeWidth={5} />
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
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "color-mix(in oklch, var(--lp-sky) 14%, transparent)", border: "1px solid color-mix(in oklch, var(--lp-sky) 30%, transparent)" }}>
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
      <VideoSection />
      <Pillars />
      <Bento />
      <DeepDives />
      <ThemeShowcase />
      <Everything />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid place-items-center shrink-0 overflow-hidden"
        style={{ width: size, height: size, borderRadius: size * 0.28, boxShadow: "0 1px 2px rgba(20,12,0,0.28), 0 6px 16px -8px rgba(212,90,63,0.55)" }}
      >
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
          <rect width="32" height="32" fill="#D45A3F" />
          <g fill="none" stroke="#FBF7EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 12.5 V25" />
            <path d="M15.4 19 Q13.75 13.45 8 12.8 Q9.65 18.35 15.4 19 Z" />
            <path d="M16.6 19 Q18.25 13.45 24 12.8 Q22.35 18.35 16.6 19 Z" />
          </g>
          <circle cx="16" cy="9.5" r="2.4" fill="#FBF7EE" />
        </svg>
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
      <div className="lp-nav">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-7 text-[14px]" style={{ color: "var(--lp-muted)" }}>
            <a href="#video" className="hover:opacity-70 transition-opacity">Demo</a>
            <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
            <a href="#ai" className="hover:opacity-70 transition-opacity">AI</a>
            <a href="#themes" className="hover:opacity-70 transition-opacity">Themes</a>
            <a href="#everything" className="hover:opacity-70 transition-opacity">Everything</a>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
              title="View source on GitHub"
              className="hidden sm:grid place-items-center w-9 h-9 rounded-[10px] transition-transform active:scale-95"
              style={{ border: "1px solid var(--lp-line-2)", background: "var(--lp-card)", color: "var(--lp-muted)" }}
            >
              <Github size={16} />
            </Link>
            <Link href={DOWNLOAD_WINDOWS} download className="lp-btn lp-btn-primary !px-4 !py-2 !text-[13.5px]">
              Download for Windows
              <Download size={15} />
            </Link>
          </div>
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
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--lp-mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--lp-my", `${e.clientY - r.top}px`);
    // pointer-driven tilt + parallax for the product stage
    el.style.setProperty("--lp-ry", `${(x - 0.5) * 11}deg`);
    el.style.setProperty("--lp-rx", `${(0.5 - y) * 7}deg`);
    el.style.setProperty("--lp-tx", `${(x - 0.5) * 26}px`);
    el.style.setProperty("--lp-ty", `${(y - 0.5) * 26}px`);
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    for (const k of ["--lp-rx", "--lp-ry", "--lp-tx", "--lp-ty"]) el.style.setProperty(k, "0px");
  }
  return (
    <section ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="lp-hero2">
      {/* atmosphere */}
      <div className="lp-hero2-wash" />
      <span className="lp-beam b1" aria-hidden />
      <span className="lp-beam b2" aria-hidden />
      <div className="lp-grid" />
      <div className="lp-blob lp-anim-drift" style={{ top: -160, left: -110, width: 500, height: 500, background: "var(--lp-terra)" }} />
      <div className="lp-blob lp-anim-drift" style={{ top: -40, right: -140, width: 460, height: 460, background: "var(--lp-gold)", animationDelay: "-6s" }} />
      <div className="lp-blob lp-anim-drift" style={{ bottom: -200, left: "48%", width: 420, height: 420, background: "var(--lp-sky)", opacity: 0.3, animationDelay: "-11s" }} />
      <div className="lp-spotlight" />
      <div className="lp-noise" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 pt-16 sm:pt-20 lg:pt-24 pb-20 lg:pb-28">
        <div className="grid lg:grid-cols-[1.04fr_1fr] gap-12 lg:gap-10 items-center">
          {/* ── left: the pitch ── */}
          <div className="lp-hero-in">
            <span className="lp-eyebrow">
              <span className="dot" />
              Local-first · private · v1.0
            </span>

            <h1 className="lp-h1 mt-7">
              <span className="block">The operating system for your</span>
              <span className="block ser lp-grad">entire life.</span>
            </h1>

            <p className="mt-7 text-[16.5px] sm:text-[18px] leading-relaxed max-w-xl" style={{ color: "var(--lp-muted)" }}>
              Capture notes, think on an infinite whiteboard, plan your day, build habits, track your money,
              and ask an AI that <strong style={{ color: "var(--lp-ink)", fontWeight: 600 }}>actually does the work</strong> — all in one
              beautiful app that runs on <span className="lp-mark">your device</span>, not someone&apos;s cloud.
            </p>

            <div className="mt-9 flex items-center gap-3 flex-wrap">
              <Link href={DOWNLOAD_WINDOWS} download className="lp-btn lp-btn-primary lp-shine">
                Download for Windows
                <Download size={17} />
              </Link>
              <a href="#features" className="lp-btn lp-btn-ghost">Explore features</a>
            </div>

            <Link
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] hover:opacity-70 transition-opacity"
              style={{ color: "var(--lp-muted)" }}
            >
              <Github size={14} /> or view the source on <span className="underline underline-offset-2">GitHub</span>
            </Link>

            <div className="lp-spec mt-10 text-[13px]" style={{ color: "var(--lp-faint)" }}>
              <Stat value={<Counter to={30} suffix="+" />} label="tools, one app" />
              <Stat value={<Counter to={100} suffix="%" />} label="on your device" />
              <Stat value="AES-256" label="encrypted vault" />
            </div>
          </div>

          {/* ── right: pointer-driven 3D product stage ── */}
          <div
            className="lp-stage relative"
            style={{ animation: "lp-rise 1s cubic-bezier(0.2,0.7,0.2,1) 0.4s both" }}
          >
            <div className="relative lp-tilt">
              <span className="lp-screenglow" aria-hidden />
              <div className="lp-pop" style={{ "--k": 0.4, "--z": "0px" } as React.CSSProperties}>
                <div className="lp-anim-float-slow">
                  <AppWindow />
                </div>
              </div>
              <FloatChip className="right-0 sm:-right-5 -top-7" k={1.7} z={104} delay="-1.5s" color="var(--lp-sky)" icon={Inbox} title="Inbox at zero" sub="AI cleared 18 emails" />
              <FloatChip className="-left-3 sm:-left-8 bottom-3" k={2.1} z={118} delay="-3.4s" color="var(--lp-terra)" icon={Flame} title="128-day streak" sub="habits on track" />
              <FloatChip className="-right-2 sm:-right-7 bottom-24" k={1.4} z={64} delay="-2.4s" color="var(--lp-violet)" icon={Lock} title="Vault locked" sub="AES-256, on device" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatChip({
  className,
  k,
  z,
  delay,
  color,
  icon: Icon,
  title,
  sub,
}: {
  className: string;
  k: number;
  z: number;
  delay: string;
  color: string;
  icon: typeof Coins;
  title: string;
  sub?: string;
}) {
  return (
    <div
      className={`hidden sm:block absolute lp-pop ${className}`}
      style={{ "--k": k, "--z": `${z}px` } as React.CSSProperties}
    >
      <div className="lp-anim-float" style={{ animationDelay: delay }}>
        <div
          className="lp-glass rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
          style={{ boxShadow: "var(--lp-shadow-lg)" }}
        >
          <span
            className="grid place-items-center w-8 h-8 rounded-xl shrink-0"
            style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
          >
            <Icon size={15} />
          </span>
          <div className="leading-tight pr-1">
            <div className="text-[12.5px] font-semibold" style={{ color: "var(--lp-ink)" }}>{title}</div>
            {sub && <div className="text-[11px]" style={{ color: "var(--lp-muted)" }}>{sub}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="text-[22px] font-semibold tabular-nums" style={{ color: "var(--lp-ink)" }}>{value}</div>
      <div className="uppercase tracking-[0.12em] text-[10.5px] mt-0.5">{label}</div>
    </div>
  );
}

// ── Faithful app-window mockup ───────────────────────────────────────────────

const RAIL_ITEMS: { icon: typeof Sun; label: string; active?: boolean }[] = [
  { icon: CalendarDays, label: "Today", active: true },
  { icon: Inbox, label: "Inbox" },
  { icon: MessagesSquare, label: "Messages" },
  { icon: NotebookPen, label: "Notes" },
  { icon: PenTool, label: "Whiteboard" },
  { icon: ListTodo, label: "Tasks" },
  { icon: Wallet, label: "Finance" },
  { icon: Shield, label: "Vault" },
];

function AppWindow() {
  return (
    <div className="lp-card overflow-hidden" style={{ boxShadow: "var(--lp-shadow-lg)" }}>
      {/* top bar */}
      <div className="flex items-center gap-2 px-3 sm:px-4 h-12 border-b" style={{ borderColor: "var(--lp-line)" }}>
        <span className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-line-2)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-line-2)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--lp-line-2)" }} />
        </span>
        <div className="ml-2 flex-1 max-w-sm hidden sm:flex items-center gap-2 rounded-[9px] px-2.5 h-7" style={{ background: TINT }}>
          <Search size={12} style={{ color: "var(--lp-faint)" }} />
          <span className="text-[11.5px]" style={{ color: "var(--lp-faint)" }}>Search everything…</span>
          <span className="ml-auto text-[10px] font-mono px-1 rounded" style={{ color: "var(--lp-faint)", border: "1px solid var(--lp-line)" }}>⌘K</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 h-7 rounded-[9px]" style={{ color: "var(--lp-terra)", border: "1px solid var(--lp-line-2)" }}>
            <Sparkles size={11} /> Ask
          </span>
          <span className="hidden sm:grid place-items-center w-7 h-7 rounded-[9px]" style={{ border: "1px solid var(--lp-line)", color: "var(--lp-gold)" }}>
            <Sun size={13} />
          </span>
        </div>
      </div>
      {/* body */}
      <div className="flex">
        {/* rail */}
        <aside className="hidden sm:flex flex-col gap-0.5 w-[176px] shrink-0 p-3 border-r" style={{ borderColor: "var(--lp-line)" }}>
          <div className="px-1.5 pb-3"><Logo size={24} /></div>
          {RAIL_ITEMS.map((it) => (
            <span
              key={it.label}
              className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-[9px] text-[13px]"
              style={it.active ? { background: "var(--lp-paper2)", color: "var(--lp-ink)", fontWeight: 500 } : { color: "var(--lp-muted)" }}
            >
              <it.icon size={15} style={{ color: it.active ? "var(--lp-terra)" : "var(--lp-faint)" }} />
              {it.label}
            </span>
          ))}
        </aside>
        {/* main */}
        <div className="flex-1 min-w-0 p-4 sm:p-5">
          <div className="text-[19px] sm:text-[22px] font-semibold tracking-[-0.02em]">Good morning, Alex</div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--lp-muted)" }}>Monday · 4 things today</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="lp-glass rounded-xl p-3.5 col-span-2 sm:col-span-1">
              <div className="text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Net worth</div>
              <div className="text-[22px] font-semibold tabular-nums">$182,540</div>
              <Spark />
            </div>
            <div className="lp-glass rounded-xl p-3.5">
              <div className="text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-faint)" }}>Habits</div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: 21 }).map((_, i) => (
                  <span key={i} className="aspect-square rounded-[3px]" style={{ background: [2, 3, 5, 8, 9, 11, 12, 15, 16, 17, 19].includes(i) ? `color-mix(in oklch, var(--lp-terra) ${44 + (i % 3) * 18}%, transparent)` : TINT }} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { t: "Trip to Japan", c: "var(--lp-terra)" },
              { t: "Book notes", c: "var(--lp-gold)" },
              { t: "Recipes", c: "var(--lp-sage)" },
            ].map((n) => (
              <div key={n.t} className="lp-glass rounded-lg p-2.5">
                <span className="block w-5 h-1.5 rounded-full mb-1.5" style={{ background: n.c }} />
                <div className="text-[11px] font-medium truncate">{n.t}</div>
                <span className="block h-1 rounded-full mt-1.5" style={{ background: TINT, width: "70%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const MARQUEE_TAGS = [
  "Today dashboard", "Calendar", "Tasks", "Reminders", "Habits", "Focus timer",
  "Goals", "Reviews", "Highlights", "Net worth", "Holdings", "Markets",
  "Subscriptions", "Notes", "Whiteboard", "Messages", "Bookmarks", "Files",
  "Inbox", "People", "Projects", "Tags", "Ask AI", "Voice capture",
  "Command palette", "Music", "Encrypted vault", "App lock", "Notifications",
  "Offline", "Sync", "Folder backups", "Light · Cloudy · Dark",
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

function VideoSection() {
  return (
    <section id="video" className="max-w-6xl mx-auto px-5 sm:px-6 py-20 sm:py-24">
      <Reveal>
        <SectionHead kicker="See it in motion" title={<>A minute inside <span className="lp-grad">Life OS.</span></>} sub="Every tool, one private app — the whole thing in motion." />
      </Reveal>
      <Reveal delay={90}>
        <div className="mt-12 relative">
          <div aria-hidden className="absolute -inset-x-10 -top-10 -bottom-10 pointer-events-none" style={{ background: "radial-gradient(60% 60% at 50% 40%, var(--lp-glow), transparent 70%)", filter: "blur(20px)" }} />
          <div className="relative lp-card p-2 sm:p-2.5 overflow-hidden" style={{ boxShadow: "var(--lp-shadow-lg)" }}>
            <video src="/life-os.mp4" poster="/life-os-poster.jpg" autoPlay muted loop playsInline controls preload="metadata" className="w-full rounded-[14px] block aspect-video" style={{ background: "#000" }} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: ReactNode; sub?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="lp-chip" style={{ color: "var(--lp-terra)" }}>{kicker}</div>
      <h2 className="mt-4 text-[32px] sm:text-[44px] font-semibold tracking-[-0.025em] leading-[1.05]">{title}</h2>
      {sub && <p className="mt-4 text-[16px] leading-relaxed" style={{ color: "var(--lp-muted)" }}>{sub}</p>}
    </div>
  );
}

function Pillars() {
  return (
    <section className="max-w-6xl mx-auto px-5 sm:px-6 py-24">
      <Reveal>
        <SectionHead kicker="Why Life OS" title={<>Ten apps&apos; worth of life, <span className="lp-grad-cool">finally together.</span></>} sub="Most tools own one slice of your life and a piece of your data. Life OS owns none of it — and connects all of it." />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PILLARS.map((p, i) => (
          <Reveal key={p.title} delay={i * 80}>
            <div className="lp-card lp-card-glow h-full p-6">
              <span className="grid place-items-center w-11 h-11 rounded-xl mb-4" style={{ background: `color-mix(in oklch, ${p.color} 18%, transparent)`, color: p.color }}>
                <p.icon size={20} />
              </span>
              <h3 className="text-[17px] font-semibold">{p.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--lp-muted)" }}>{p.body}</p>
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
        <SectionHead kicker="The toolkit" title={<>Everything you run your life with, <span className="lp-grad">crafted to perfection.</span></>} sub="Not a wall of features — a set of tools that each feel hand-built, and quietly work together." />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Reveal className="sm:col-span-2">
          <BentoCard wide icon={Wallet} color="var(--lp-gold)" title="Finance that's alive" body="Net worth, live-valued crypto & stocks, on-chain wallet balances, and a trend that draws itself — all in your base currency." visual={<BentoFinance />} />
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
          <BentoCard icon={NotebookPen} color="var(--lp-sky)" title="Notes, in one wall" body="Markdown, wiki-links and images — every note in sight, instantly searchable." visual={<BentoNotes />} />
        </Reveal>
        <Reveal delay={140}>
          <BentoCard icon={PenTool} color="var(--lp-gold)" title="An infinite whiteboard" body="Think visually on an endless Excalidraw canvas — autosaved, theme-synced." visual={<BentoWhiteboard />} />
        </Reveal>
        <Reveal delay={210}>
          <BentoCard icon={MessagesSquare} color="var(--lp-sky)" title="Your inbox, unified" body="Read and triage your Gmail threads without leaving your second brain." visual={<BentoMessages />} />
        </Reveal>
        <Reveal delay={70} className="sm:col-span-2">
          <BentoCard wide icon={Sparkles} color="var(--lp-violet)" title="AI that acts" body="Ask in plain words — it does the work and confirms, instead of just chatting." visual={<BentoAsk />} />
        </Reveal>
        <Reveal delay={140}>
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
        id="canvas"
        kicker="Think & connect"
        title={<>An infinite canvas. <span className="lp-grad-cool">A unified inbox.</span></>}
        body="Sketch, diagram, and brainstorm on a single infinite Excalidraw whiteboard that autosaves and follows your theme. And read your Gmail right inside Life OS — your messages next to the notes and tasks they're about."
        points={["Infinite Excalidraw whiteboard, autosaved locally", "Unified Messages — your Gmail threads", "Everything in one private place"]}
        visual={<CanvasVisual />}
        flip
      />
      <DeepDive
        id="money"
        kicker="Finance, alive"
        title={<>Your whole net worth, <span className="lp-grad">valued live.</span></>}
        body="Accounts, crypto and stocks valued by the minute, on-chain wallet balances, an allocation donut, and a net-worth trend that draws itself — all converted into your base currency with real exchange rates. Read-only, nothing leaves your machine."
        points={["Live crypto & stock holdings + on-chain balances", "Multi-currency with real FX", "Net-worth trend & allocation"]}
        visual={<FinanceVisual />}
        flip={false}
      />
      <DeepDive
        id="private"
        kicker="Private by design"
        title={<>A vault only <span className="lp-grad">you</span> can open.</>}
        body="Passwords, cards, recovery codes — encrypted on your device with a key derived from your passcode (PBKDF2 + AES-GCM). Reading the database directly reveals only ciphertext. Lock the whole app behind it, too."
        points={["AES-GCM encryption at rest", "Passcode never stored — only verified", "Optional whole-app lock"]}
        visual={<VaultVisual />}
        flip
      />
    </div>
  );
}

function DeepDive({ id, kicker, title, body, points, visual, flip }: { id: string; kicker: string; title: ReactNode; body: string; points: string[]; visual: ReactNode; flip: boolean }) {
  return (
    <section id={id} className="max-w-6xl mx-auto px-5 sm:px-6 py-16">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <Reveal className={flip ? "lg:order-2" : ""}>
          <div className="lp-chip" style={{ color: "var(--lp-terra)" }}>{kicker}</div>
          <h2 className="mt-4 text-[30px] sm:text-[40px] font-semibold tracking-[-0.025em] leading-[1.08]">{title}</h2>
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
        <Reveal delay={120} className={flip ? "lg:order-1" : ""}>{visual}</Reveal>
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
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--lp-sage)" }}>
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

function CanvasVisual() {
  return (
    <div className="lp-card p-5 lp-anim-float-slow">
      <div className="lp-glass rounded-xl relative overflow-hidden" style={{ height: 190 }}>
        <span className="absolute rounded-lg" style={{ left: 26, top: 28, width: 96, height: 60, background: "color-mix(in oklch, var(--lp-sky) 26%, transparent)", border: "2px solid var(--lp-sky)" }} />
        <span className="absolute rounded-full" style={{ right: 34, top: 36, width: 76, height: 76, background: "color-mix(in oklch, var(--lp-sage) 26%, transparent)", border: "2px solid var(--lp-sage)" }} />
        <span className="absolute" style={{ left: 70, bottom: 22, width: 70, height: 46, background: "color-mix(in oklch, var(--lp-gold) 26%, transparent)", border: "2px solid var(--lp-gold)", transform: "rotate(45deg)" }} />
        <svg className="absolute" style={{ left: 110, top: 60 }} width="96" height="60">
          <path d="M4 50 C 30 6, 60 6, 90 34" fill="none" stroke="var(--lp-terra)" strokeWidth="2.4" />
          <path d="M80 24 L91 35 L76 39 Z" fill="var(--lp-terra)" />
        </svg>
      </div>
      <div className="mt-4 space-y-2">
        {[
          { n: "Maya", s: "Lunch on Friday?", c: "var(--lp-terra)" },
          { n: "Newsletter", s: "This week's digest", c: "var(--lp-sky)" },
        ].map((m) => (
          <div key={m.n} className="lp-glass rounded-lg px-3 py-2 flex items-center gap-2.5">
            <span className="grid place-items-center w-7 h-7 rounded-full text-[11px] font-semibold text-white shrink-0" style={{ background: m.c }}>{m.n[0]}</span>
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium truncate">{m.n}</div>
              <div className="text-[11px] truncate" style={{ color: "var(--lp-muted)" }}>{m.s}</div>
            </div>
            <MessagesSquare size={13} className="ml-auto" style={{ color: "var(--lp-faint)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function VaultVisual() {
  return (
    <div className="lp-card p-8 lp-anim-float-slow text-center">
      <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl mb-5" style={{ background: "color-mix(in oklch, var(--lp-terra) 16%, transparent)", color: "var(--lp-terra)", boxShadow: "0 0 40px -8px var(--lp-glow)" }}>
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
        <Shield size={13} style={{ color: "var(--lp-sage)" }} /> Encrypted on this device · never synced
      </div>
    </div>
  );
}

// ── Theme showcase — the same surface in all three themes ────────────────────

const SHOWCASE_THEMES: { key: LpTheme; name: string; icon: typeof Sun; vars: Record<string, string> }[] = [
  {
    key: "light",
    name: "Light",
    icon: Sun,
    vars: { "--lp-bg": "#f6f1e8", "--lp-paper": "#fbf7ee", "--lp-paper2": "#f2ebda", "--lp-ink": "#1a1a1a", "--lp-muted": "#8a7f6b", "--lp-line": "rgba(26,26,26,0.08)", "--lp-terra": "#d45a3f", "--lp-sage": "#7a8b6f", "--lp-gold": "#c8995a" },
  },
  {
    key: "cloudy",
    name: "Cloudy",
    icon: Cloud,
    vars: { "--lp-bg": "#0b1024", "--lp-paper": "rgba(255,255,255,0.08)", "--lp-paper2": "rgba(255,255,255,0.12)", "--lp-ink": "#f3f6ff", "--lp-muted": "#aeb9d8", "--lp-line": "rgba(255,255,255,0.18)", "--lp-terra": "#6aa6ff", "--lp-sage": "#54e6b0", "--lp-gold": "#ffce73" },
  },
  {
    key: "dark",
    name: "Dark",
    icon: Moon,
    vars: { "--lp-bg": "#1a1612", "--lp-paper": "#221d17", "--lp-paper2": "#1e1a14", "--lp-ink": "#f2eadb", "--lp-muted": "#a7977c", "--lp-line": "rgba(242,234,219,0.1)", "--lp-terra": "#e7775d", "--lp-sage": "#9cb089", "--lp-gold": "#e4b871" },
  },
];

function ThemeShowcase() {
  return (
    <section id="themes" className="max-w-6xl mx-auto px-5 sm:px-6 py-24">
      <Reveal>
        <SectionHead kicker="Three moods, one OS" title={<>Light, cloudy, or dark — <span className="lp-grad">your call.</span></>} sub="A single toggle re-skins the entire app. Warm paper by day, frosted-glass cloudy in between, deep warm dark at night." />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {SHOWCASE_THEMES.map((t, i) => (
          <Reveal key={t.key} delay={i * 90}>
            <div
              className="rounded-[18px] p-4 h-full"
              style={{ ...(t.vars as React.CSSProperties), background: "var(--lp-bg)", border: "1px solid var(--lp-line)", color: "var(--lp-ink)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="grid place-items-center w-7 h-7 rounded-lg" style={{ background: "color-mix(in oklch, var(--lp-terra) 18%, transparent)", color: "var(--lp-terra)" }}>
                  <t.icon size={14} />
                </span>
                <span className="text-[13px] font-semibold">{t.name}</span>
              </div>
              {/* mini app card */}
              <div className="rounded-xl p-3" style={{ background: "var(--lp-paper)", border: "1px solid var(--lp-line)" }}>
                <div className="text-[9px] uppercase tracking-[0.14em]" style={{ color: "var(--lp-muted)" }}>Net worth</div>
                <div className="text-[18px] font-semibold tabular-nums">$182,540</div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: 14 }).map((_, k) => (
                    <span key={k} className="aspect-square rounded-[2px]" style={{ background: [1, 2, 4, 6, 7, 9, 11, 12].includes(k) ? "var(--lp-terra)" : "color-mix(in oklch, var(--lp-line) 80%, transparent)" }} />
                  ))}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <span className="text-[10px] px-2 py-1 rounded-md font-medium" style={{ background: "var(--lp-terra)", color: "#fff" }}>Add</span>
                  <span className="text-[10px] px-2 py-1 rounded-md" style={{ background: "var(--lp-paper2)", color: "var(--lp-muted)" }}>Today</span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Everything() {
  return (
    <section id="everything" className="max-w-6xl mx-auto px-5 sm:px-6 py-24">
      <Reveal>
        <SectionHead kicker="Everything included" title={<>One purchase of your attention. <span className="lp-grad">Every tool below.</span></>} sub="No add-ons, no upsells, no per-feature paywall. It's all here, and it's all yours." />
      </Reveal>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EVERYTHING.map((g, i) => (
          <Reveal key={g.cat} delay={i * 60}>
            <div className="lp-card h-full p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="grid place-items-center w-9 h-9 rounded-[10px]" style={{ background: TINT, color: "var(--lp-terra)" }}>
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

      <Reveal>
        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {[Bell, Mic, PenTool, FolderDown, Command, Timer, Music, RefreshCw, WifiOff, Download, Highlighter, FolderKanban, Bookmark, Users, ListTodo, Flame].map((I, i) => (
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
          <div className="lp-blob lp-anim-drift" style={{ top: -100, left: "20%", width: 360, height: 360, background: "var(--lp-terra)", opacity: 0.35 }} />
          <div className="lp-blob lp-anim-drift" style={{ bottom: -120, right: "15%", width: 340, height: 340, background: "var(--lp-gold)", opacity: 0.35, animationDelay: "-7s" }} />
          <div className="lp-grid" />
          <div className="relative">
            <h2 className="text-[34px] sm:text-[52px] font-semibold tracking-[-0.03em] leading-[1.04] max-w-3xl mx-auto">
              Your life deserves <span className="lp-grad">a better OS.</span>
            </h2>
            <p className="mt-5 text-[17px] max-w-xl mx-auto" style={{ color: "var(--lp-muted)" }}>
              Private. Local. Beautiful. Everything in one place — and it opens instantly.
            </p>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <Link href={DOWNLOAD_WINDOWS} download className="lp-btn lp-btn-primary !text-[16px] !px-7 !py-4">
                Download for Windows
                <Download size={18} />
              </Link>
              <a href="#everything" className="lp-btn lp-btn-ghost !px-6 !py-4">See everything</a>
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
        <div className="text-[13px]" style={{ color: "var(--lp-faint)" }}>Local-first · built with care · v1.0</div>
        <Link href={GITHUB} target="_blank" rel="noreferrer" className="text-[13.5px] inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity" style={{ color: "var(--lp-muted)" }}>
          View on GitHub <ArrowRight size={14} />
        </Link>
      </div>
    </footer>
  );
}
