"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessagesSquare, Search, ArrowRight } from "lucide-react";
import {
  CHANNEL_LABEL,
  type Channel,
  type MsgThread,
} from "@/lib/messaging/types";
import { useMsgAccounts, useMsgThreads } from "@/lib/store/messaging";
import { BrandLogo } from "@/components/brand-icons";
import { Conversation } from "./conversation";

const CHANNEL_DOT: Record<Channel, string> = {
  telegram: "#2AABEE",
  gmail: "#EA4335",
};

const ONBOARD: { channel: Channel; blurb: string }[] = [
  { channel: "telegram", blurb: "Your chats, DMs and groups" },
  { channel: "gmail", blurb: "Your Gmail inbox and threads" },
];

function fmtTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  const days = (now.getTime() - ts) / 86_400_000;
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const accounts = useMsgAccounts();
  const connected = useMemo(
    () => (accounts ?? []).filter((a) => a.status === "connected"),
    [accounts],
  );

  if (accounts === undefined) {
    return <div className="h-[calc(100dvh-58px)]" />;
  }

  if (connected.length === 0) {
    return <Onboarding />;
  }

  return <Inbox connectedChannels={connected.map((a) => a.channel)} />;
}

// ── connected: the two-pane inbox ─────────────────────────────────────────────

function Inbox({ connectedChannels }: { connectedChannels: Channel[] }) {
  const [filter, setFilter] = useState<Channel | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const threads = useMsgThreads(filter);

  const shown = useMemo(() => {
    const list = threads ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.snippet.toLowerCase().includes(needle),
    );
  }, [threads, q]);

  const selected = useMemo(
    () => (threads ?? []).find((t) => t.id === selectedId) ?? null,
    [threads, selectedId],
  );

  const showFilters = connectedChannels.length > 1;

  return (
    <div className="flex h-[calc(100dvh-58px)] overflow-hidden">
      {/* Left: thread list */}
      <div
        className={`${
          selected ? "hidden sm:flex" : "flex"
        } w-full sm:w-[340px] shrink-0 border-r border-[var(--line)] flex-col min-h-0`}
      >
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <MessagesSquare size={18} className="text-[var(--terra)]" strokeWidth={1.9} />
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
              Messages
            </h1>
          </div>

          <label className="flex items-center gap-2 h-9 px-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper)] focus-within:border-[var(--terra)] transition">
            <Search size={14} className="text-[var(--muted-2)] shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations"
              className="flex-1 min-w-0 bg-transparent text-[13px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
            />
          </label>

          {showFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterChip>
              {connectedChannels.map((c) => (
                <FilterChip
                  key={c}
                  active={filter === c}
                  onClick={() => setFilter(c)}
                  channel={c}
                >
                  {CHANNEL_LABEL[c]}
                </FilterChip>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {threads === undefined ? (
            <ListSkeleton />
          ) : shown.length === 0 ? (
            <ThreadsEmpty searching={q.trim().length > 0} />
          ) : (
            shown.map((t) => (
              <ThreadRow
                key={t.id}
                t={t}
                active={t.id === selectedId}
                onClick={() => setSelectedId(t.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: conversation */}
      <div
        className={`flex-1 min-w-0 ${selected ? "flex" : "hidden sm:flex"} flex-col min-h-0`}
      >
        <Conversation thread={selected} onBack={() => setSelectedId(null)} />
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  channel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  channel?: Channel;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 h-7 rounded-full text-[12px] font-medium whitespace-nowrap transition ${
        active
          ? "bg-[var(--terra)] text-white"
          : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
      }`}
    >
      {channel ? (
        <span className="grid place-items-center w-[18px] h-[18px] rounded-full bg-white shrink-0">
          <BrandLogo channel={channel} size={13} />
        </span>
      ) : (
        <span className="w-[18px]" />
      )}
      {children}
    </button>
  );
}

function ThreadRow({
  t,
  active,
  onClick,
}: {
  t: MsgThread;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[var(--line)] transition ${
        active ? "bg-[var(--paper-2)]" : "hover:bg-[var(--paper-2)]/60"
      }`}
    >
      <span
        className="relative grid place-items-center w-10 h-10 rounded-full shrink-0 text-[13px] font-semibold"
        style={{
          background: "color-mix(in oklch, var(--terra) 14%, transparent)",
          color: "var(--terra)",
        }}
      >
        {t.avatarText || t.title.slice(0, 2).toUpperCase()}
        <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-4 h-4 rounded-full bg-[var(--bg)]">
          <BrandLogo channel={t.channel} size={12} />
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-[var(--ink)] truncate flex-1">
            {t.title}
          </span>
          <span className="text-[10.5px] text-[var(--muted-2)] shrink-0 tabular-nums">
            {fmtTime(t.lastTs)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[12px] text-[var(--muted)] truncate flex-1">
            {t.snippet}
          </span>
          {t.unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-[var(--terra)] text-white text-[10px] font-semibold tabular-nums">
              {t.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[58px] rounded-[12px] bg-[var(--bg-2)] animate-pulse"
        />
      ))}
    </div>
  );
}

function ThreadsEmpty({ searching }: { searching: boolean }) {
  return (
    <div className="px-6 text-center mt-12 text-[13px] text-[var(--muted)]">
      {searching
        ? "No matches."
        : "No conversations yet — sync from Settings → Connections."}
    </div>
  );
}

// ── disconnected: onboarding hero ─────────────────────────────────────────────

function Onboarding() {
  return (
    <div className="h-[calc(100dvh-58px)] overflow-y-auto grid place-items-center px-6 py-10">
      <div className="w-full max-w-[440px]">
        <div className="text-center">
          <div
            className="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-[20px]"
            style={{
              background: "color-mix(in oklch, var(--terra) 16%, transparent)",
              color: "var(--terra)",
              boxShadow: "var(--shadow-1)",
            }}
          >
            <MessagesSquare size={28} strokeWidth={1.7} />
          </div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
            Bring your inboxes together
          </h1>
          <p className="mt-2 text-[14px] text-[var(--muted)] leading-relaxed max-w-[360px] mx-auto">
            Read and reply to Telegram and Gmail in one place. Everything
            stays on this device — no server.
          </p>
        </div>

        <div className="mt-7 space-y-2.5">
          {ONBOARD.map(({ channel, blurb }) => (
            <Link
              key={channel}
              href="/settings#connections"
              className="life-card life-card-hover p-3.5 flex items-center gap-3.5 group"
            >
              <span
                className="grid place-items-center w-11 h-11 rounded-[13px] shrink-0 bg-white"
                style={{ boxShadow: "var(--shadow-1)" }}
              >
                <BrandLogo channel={channel} size={26} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-medium text-[var(--ink)]">
                  {CHANNEL_LABEL[channel]}
                </div>
                <div className="text-[12.5px] text-[var(--muted)]">{blurb}</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--terra)] shrink-0">
                Connect
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-5 text-center text-[11.5px] text-[var(--muted-2)] leading-relaxed">
          Set each up once in Settings → Connections. Telegram is the quickest to
          start.
        </p>
      </div>
    </div>
  );
}
