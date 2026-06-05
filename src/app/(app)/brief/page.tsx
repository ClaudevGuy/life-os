"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ListTodo,
  Bell,
  Flame,
  CreditCard,
  Cake,
  Wallet,
  Target,
  HeartPulse,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAllItems } from "@/lib/store/items";
import { useSnapshots } from "@/lib/store/snapshots";
import { useHealthLogs } from "@/lib/store/health";
import { aiHeaders } from "@/lib/ai-key";
import { greetingFor, timeOfDay } from "@/lib/time-of-day";
import { computeBrief, briefSummaryText, briefIsEmpty } from "@/lib/brief";

export default function BriefPage() {
  const itemsRaw = useAllItems();
  const snapshots = useSnapshots() ?? [];
  const health = useHealthLogs(30) ?? [];
  const items = useMemo(() => itemsRaw ?? [], [itemsRaw]);

  const now = useMemo(() => new Date(), []);
  const data = useMemo(
    () => computeBrief(items, snapshots, health, now),
    [items, snapshots, health, now],
  );
  const empty = briefIsEmpty(data);

  const [narrative, setNarrative] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error" | "nokey">("idle");
  const started = useRef(false);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const greeting = greetingFor(timeOfDay(now));

  async function generate() {
    if (empty) return;
    setState("loading");
    setNarrative("");
    try {
      const res = await fetch("/api/ai/daily-brief", {
        method: "POST",
        headers: aiHeaders(),
        body: JSON.stringify({ summary: briefSummaryText(data), date: dateLabel }),
      });
      if (!res.ok || !res.body) {
        setState(res.status === 503 ? "nokey" : "error");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let got = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        got = true;
        setNarrative((n) => n + dec.decode(value, { stream: true }));
      }
      setState(got ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    if (started.current) return;
    if (itemsRaw === undefined) return; // still loading
    started.current = true;
    if (!empty) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsRaw, empty]);

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto pg-enter space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="life-h1 inline-flex items-center gap-2">
            <Sparkles size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
            Daily brief
          </h1>
          <p className="text-[14.5px] text-[var(--muted)] mt-1">
            {greeting} {dateLabel}.
          </p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={() => generate()}
            disabled={state === "loading"}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-[var(--line)] text-[13px] font-medium text-[var(--ink)] hover:border-[var(--terra)] hover:text-[var(--terra)] transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={state === "loading" ? "animate-spin" : ""} />
            Regenerate
          </button>
        )}
      </header>

      {empty ? (
        <div className="life-card p-10 text-center">
          <div
            className="mx-auto mb-4 grid place-items-center w-[56px] h-[56px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
            style={{ boxShadow: "var(--shadow-1)" }}
          >
            <Sparkles size={24} strokeWidth={1.6} />
          </div>
          <div className="text-[18px] font-semibold text-[var(--ink)]">All quiet.</div>
          <p className="mt-1.5 text-[13.5px] text-[var(--muted)] max-w-sm mx-auto">
            Nothing pressing right now — no tasks due, habits, or renewals to
            flag. Capture something and your brief will fill in.
          </p>
        </div>
      ) : (
        <>
          {/* Narrative */}
          <section className="life-card p-6 relative overflow-hidden">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: "var(--terra)" }}
            />
            {state === "loading" && narrative === "" ? (
              <div className="inline-flex items-center gap-2 text-[var(--muted)] text-[14px]">
                <Loader2 size={16} className="animate-spin" />
                Writing your brief…
              </div>
            ) : state === "nokey" ? (
              <p className="text-[14px] text-[var(--muted)] leading-relaxed">
                Add an AI key in{" "}
                <Link href="/settings" className="text-[var(--terra)] hover:underline">
                  Settings → AI
                </Link>{" "}
                to get a written brief. Your day at a glance is below regardless.
              </p>
            ) : state === "error" ? (
              <p className="text-[14px] text-[var(--muted)]">
                Couldn&apos;t generate the brief.{" "}
                <button onClick={() => generate()} className="text-[var(--terra)] hover:underline">
                  Try again
                </button>
                .
              </p>
            ) : (
              <div className="text-[15px] text-[var(--ink-2)] leading-relaxed space-y-3">
                {narrative.split(/\n\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {state === "loading" && (
                  <span className="inline-block w-2 h-4 align-middle bg-[var(--terra)] animate-pulse" />
                )}
              </div>
            )}
          </section>

          {/* At a glance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Glance
              icon={ListTodo}
              color="var(--terra)"
              title="Due today"
              href="/tasks"
              empty="Nothing due"
              show={data.dueToday.length > 0 || data.overdue > 0}
            >
              {data.dueToday.length > 0 && (
                <ul className="space-y-1">
                  {data.dueToday.slice(0, 5).map((t) => (
                    <li key={t.id} className="text-[13.5px] text-[var(--ink-2)] truncate">
                      • {t.title}
                    </li>
                  ))}
                </ul>
              )}
              {data.overdue > 0 && (
                <p className="text-[12.5px] text-[var(--bad)] mt-1.5">
                  {data.overdue} overdue
                </p>
              )}
            </Glance>

            <Glance
              icon={Bell}
              color="var(--gold)"
              title="Reminders today"
              href="/calendar"
              show={data.remindersToday.length > 0}
            >
              <ul className="space-y-1">
                {data.remindersToday.map((r) => (
                  <li key={r.id} className="text-[13.5px] text-[var(--ink-2)] flex justify-between gap-2">
                    <span className="truncate">{r.title}</span>
                    <span className="text-[var(--muted-2)] tabular-nums shrink-0">{r.at}</span>
                  </li>
                ))}
              </ul>
            </Glance>

            <Glance
              icon={Flame}
              color="var(--terra)"
              title="Habits"
              href="/habits"
              show={data.habits.total > 0}
            >
              <p className="text-[14px] text-[var(--ink-2)]">
                <span className="text-[22px] font-semibold tabular-nums text-[var(--ink)]">
                  {data.habits.pending}
                </span>{" "}
                of {data.habits.total} still to check off
              </p>
            </Glance>

            <Glance
              icon={Wallet}
              color="var(--gold)"
              title="Net worth"
              href="/finance"
              show={!!data.netWorth}
            >
              {data.netWorth && (
                <p className="text-[14px] text-[var(--ink-2)]">
                  <span className="text-[20px] font-semibold tabular-nums text-[var(--ink)]">
                    {Math.round(data.netWorth.value).toLocaleString()} {data.netWorth.base}
                  </span>{" "}
                  <span style={{ color: data.netWorth.change >= 0 ? "var(--sage)" : "var(--bad)" }}>
                    {data.netWorth.change >= 0 ? "▲" : "▼"} {Math.abs(data.netWorth.change).toFixed(1)}% / wk
                  </span>
                </p>
              )}
            </Glance>

            <Glance
              icon={CreditCard}
              color="var(--sky)"
              title="Renewing soon"
              href="/subscriptions"
              show={data.renewals.length > 0}
            >
              <ul className="space-y-1">
                {data.renewals.map((r) => (
                  <li key={r.id} className="text-[13.5px] text-[var(--ink-2)] flex justify-between gap-2">
                    <span className="truncate">{r.title}</span>
                    <span className="text-[var(--muted-2)] shrink-0">
                      {r.days === 0 ? "today" : `in ${r.days}d`}
                    </span>
                  </li>
                ))}
              </ul>
            </Glance>

            <Glance
              icon={Cake}
              color="var(--plum)"
              title="Birthdays today"
              href="/people"
              show={data.birthdays.length > 0}
            >
              <ul className="space-y-1">
                {data.birthdays.map((b) => (
                  <li key={b.id} className="text-[13.5px] text-[var(--ink-2)]">🎂 {b.name}</li>
                ))}
              </ul>
            </Glance>

            <Glance
              icon={Target}
              color="var(--violet, var(--plum))"
              title="Goals needing a nudge"
              href="/goals"
              show={data.goalsStale.length > 0}
            >
              <ul className="space-y-1">
                {data.goalsStale.map((g) => (
                  <li key={g.id} className="text-[13.5px] text-[var(--ink-2)] flex justify-between gap-2">
                    <span className="truncate">{g.title}</span>
                    <span className="text-[var(--muted-2)] shrink-0">{g.days}d</span>
                  </li>
                ))}
              </ul>
            </Glance>

            <Glance
              icon={HeartPulse}
              color="var(--sage)"
              title="Last health check-in"
              href="/health"
              show={!!data.health}
            >
              {data.health && (
                <p className="text-[14px] text-[var(--ink-2)]">
                  {data.health.sleep != null && (
                    <span>
                      <b>{data.health.sleep}h</b> sleep
                    </span>
                  )}
                  {data.health.sleep != null && data.health.mood != null && " · "}
                  {data.health.mood != null && (
                    <span>
                      mood <b>{data.health.mood}/5</b>
                    </span>
                  )}
                </p>
              )}
            </Glance>
          </div>
        </>
      )}
    </div>
  );
}

function Glance({
  icon: Icon,
  color,
  title,
  href,
  show,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  title: string;
  href: string;
  show: boolean;
  empty?: string;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <Link href={href} className="group life-card p-5 hover:border-[var(--terra)]/40 transition">
      <div className="flex items-center justify-between mb-3">
        <h2 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)]">
          <span
            className="grid place-items-center w-6 h-6 rounded-[7px]"
            style={{ background: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
          >
            <Icon size={12} />
          </span>
          {title}
        </h2>
        <ArrowRight size={13} className="text-[var(--muted-2)] group-hover:text-[var(--terra)] transition" />
      </div>
      {children}
    </Link>
  );
}
