"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  Cake,
  Check,
  CreditCard,
  Flag,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/store/db";
import {
  computeFeed,
  feedPrimary,
  feedSecondary,
  type FeedNotif,
  type NotifCat,
} from "@/lib/notify";
import {
  getCats,
  getReadKeys,
  markRead,
  onReadChange,
} from "@/lib/notify-state";

type IconCmp = React.ComponentType<{ size?: number; strokeWidth?: number }>;

const CAT_STYLE: Record<NotifCat, { icon: IconCmp; color: string }> = {
  task: { icon: ListChecks, color: "var(--sky)" },
  subscription: { icon: CreditCard, color: "var(--gold)" },
  deadline: { icon: Flag, color: "var(--sage)" },
  birthday: { icon: Cake, color: "var(--plum)" },
};

function urgencyColor(d: number): string {
  if (d < 0) return "var(--bad)";
  if (d <= 1) return "var(--terra)";
  if (d <= 3) return "var(--gold)";
  return "var(--muted)";
}

function pillLabel(d: number): string {
  if (d < 0) return d === -1 ? "1d late" : `${-d}d late`;
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `in ${d}d`;
}

export function NotificationBell() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [cats, setCats] = useState<Record<NotifCat, boolean> | null>(null);
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  // Keys that were unread at the moment the panel was opened — kept so their
  // "new" dot stays visible during this viewing even after we mark them read.
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  const items = useLiveQuery(() => db.items.toArray(), []);

  // Client-only bootstrap + a 60s tick so labels and buckets stay current.
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    setCats(getCats());
    setReadKeys(getReadKeys());
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const unsub = onReadChange(() => setReadKeys(getReadKeys()));
    const refreshCats = () => setCats(getCats());
    window.addEventListener("storage", refreshCats);
    window.addEventListener("focus", refreshCats);
    return () => {
      clearInterval(tick);
      unsub();
      window.removeEventListener("storage", refreshCats);
      window.removeEventListener("focus", refreshCats);
    };
  }, []);

  const feed = useMemo(() => {
    if (!items || !now || !cats) return [] as FeedNotif[];
    return computeFeed(items, now).filter((n) => cats[n.cat]);
  }, [items, now, cats]);

  const unreadCount = useMemo(
    () => feed.reduce((acc, n) => (readKeys.has(n.key) ? acc : acc + 1), 0),
    [feed, readKeys],
  );

  const markAll = useCallback(() => {
    markRead(feed.map((n) => ({ key: n.key, targetYmd: n.targetYmd })));
  }, [feed]);

  // Opening the panel snapshots what's new, then clears the badge.
  function toggleOpen() {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setSeen(new Set(feed.filter((n) => !readKeys.has(n.key)).map((n) => n.key)));
        markAll();
      }
      return !wasOpen;
    });
  }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openItem(n: FeedNotif) {
    markRead([{ key: n.key, targetYmd: n.targetYmd }]);
    setOpen(false);
    router.push(n.url);
  }

  if (!mounted) {
    // Reserve the slot so the bar doesn't shift on hydration.
    return <div className="w-[30px] h-[30px]" aria-hidden />;
  }

  const groups: Array<{ label: string; rows: FeedNotif[] }> = [
    { label: "Overdue", rows: feed.filter((n) => n.daysUntil < 0) },
    { label: "Today", rows: feed.filter((n) => n.daysUntil === 0) },
    { label: "Coming up", rows: feed.filter((n) => n.daysUntil >= 1) },
  ].filter((g) => g.rows.length > 0);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        className="relative grid place-items-center w-[30px] h-[30px] rounded-[10px] border transition hover:-translate-y-px active:translate-y-0"
        style={{
          borderColor: open ? "var(--terra)" : "var(--line)",
          background: open ? "var(--terra-tint)" : "var(--paper)",
          color: open ? "var(--terra)" : "var(--ink-2)",
        }}
      >
        <Bell size={15} strokeWidth={1.7} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full text-[10px] font-semibold tabular-nums text-white"
            style={{ background: "var(--bad)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-[352px] max-w-[calc(100vw-24px)] rounded-[14px] border border-[var(--line-2)] bg-[var(--paper)] overflow-hidden z-50 life-rise"
          style={{ boxShadow: "var(--shadow-2)" }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2.5">
            <span className="text-sm font-semibold text-[var(--ink)]">
              Notifications
            </span>
            {feed.length > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-[12px] text-[var(--terra)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-2 pb-1">
            {groups.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <Check size={20} className="mx-auto text-[var(--sage)]" />
                <p className="mt-2 text-[13px] text-[var(--muted)]">
                  You&apos;re all caught up.
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted-2)]">
                  Nudges appear 5, 3 and 1 days before, and on the day.
                </p>
              </div>
            ) : (
              groups.map((g) => (
                <div key={g.label}>
                  <div className="px-2 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    {g.label}
                  </div>
                  {g.rows.map((n) => (
                    <Row
                      key={n.key}
                      n={n}
                      isNew={seen.has(n.key)}
                      onOpen={() => openItem(n)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/calendar");
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 border-t border-[var(--line)] text-[12px] text-[var(--terra)] hover:bg-[var(--bg-card-hover)] transition"
          >
            <span className="inline-flex items-center gap-1.5">
              Open calendar
              <ArrowRight size={13} />
            </span>
            <span className="text-[11px] text-[var(--muted-2)]">
              5 / 3 / 1 / 0-day reminders
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  n,
  isNew,
  onOpen,
}: {
  n: FeedNotif;
  isNew: boolean;
  onOpen: () => void;
}) {
  const { icon: Icon, color } = CAT_STYLE[n.cat];
  const uColor = urgencyColor(n.daysUntil);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[10px] text-left hover:bg-[var(--bg-card-hover)] transition"
    >
      <span
        className="grid place-items-center w-[30px] h-[30px] rounded-[9px] shrink-0"
        style={{
          background: `color-mix(in oklch, ${color} 16%, transparent)`,
          color,
        }}
      >
        <Icon size={15} strokeWidth={1.8} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium text-[var(--ink)] truncate">
          {feedPrimary(n)}
        </span>
        <span className="block text-[11px] text-[var(--muted)] truncate">
          {feedSecondary(n)}
        </span>
      </span>
      <span
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[7px] shrink-0 tabular-nums"
        style={{
          color: uColor,
          background: `color-mix(in oklch, ${uColor} 14%, transparent)`,
        }}
      >
        {pillLabel(n.daysUntil)}
      </span>
      <span
        className="w-[7px] h-[7px] rounded-full shrink-0"
        style={{ background: isNew ? "var(--terra)" : "transparent" }}
        aria-hidden
      />
    </button>
  );
}
