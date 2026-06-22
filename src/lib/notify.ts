"use client";

/**
 * Local notifications. Life OS has no push server, so these fire while the app
 * is open (a 60s scheduler in PwaBootstrap) — advance heads-ups for anything
 * dated (tasks, subscription renewals, project deadlines, birthdays) at 5 / 3 /
 * 1 / 0 days out, plus time-of-day reminders and habit nudges. Shown via the
 * service worker so a click focuses the app, and mirrored in the in-app
 * notification center (the bell), which reads `computeFeed` directly.
 */
import type { StoredItem } from "@/lib/store/db";
import { ymd } from "@/lib/ymd";
import { isPending, type Cadence } from "@/lib/habits";
import { readSubscription, formatMoney } from "@/lib/subscriptions";
import {
  type NotifCat,
  getCats,
  getFiredKeys,
  markFired,
  pruneState,
} from "@/lib/notify-state";

export type { NotifCat };

const ENABLED_KEY = "lifeos.notify.enabled";

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}
export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : "denied";
}
export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
export function notifyEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}
export function setNotifyEnabled(v: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/* ── the upcoming-items feed ─────────────────────────────────────────── */

/** One upcoming dated item, as shown in the bell and (at milestones) fired. */
export type FeedNotif = {
  /** Identity for read/fired dedup: `cat:id:bucket:YYYY-MM-DD`. */
  key: string;
  id: string;
  cat: NotifCat;
  /** Item display title (the person's name for birthdays). */
  title: string;
  /** Small trailing detail — "$9.99", "turns 30" — or null. */
  meta: string | null;
  url: string;
  targetYmd: string;
  /** Whole local days until the target (negative = overdue). */
  daysUntil: number;
  /** Reminder-type task — its same-day ping is left to the exact-time path. */
  isReminder: boolean;
};

/** Days out at which we ping. Also the buckets `bucketOf` snaps to. */
const MILESTONES = [5, 3, 1, 0];
const UPCOMING_DAYS = 5;
const OVERDUE_DAYS = -30;

/** Whole local days from `now` to `target` (negative = in the past). */
function daysUntilLocal(now: Date, target: Date): number {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(target);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Snap raw days-until to the last milestone reached, so an item's unread/fire
 * key only changes when it crosses 5 / 3 / 1 / 0 — not on every in-between day.
 */
function bucketOf(daysUntil: number): number {
  if (daysUntil >= 4) return 5;
  if (daysUntil >= 2) return 3;
  if (daysUntil >= 1) return 1;
  return 0;
}

/** Next occurrence (today or later) of a birthday, plus the age it turns. */
function nextBirthday(
  s: string,
  now: Date,
): { date: Date; turns: number | null } | null {
  let mo: number;
  let da: number;
  let year: number | null = null;

  const md = /^(\d{1,2})-(\d{1,2})$/.exec(s);
  if (md) {
    mo = +md[1];
    da = +md[2];
  } else {
    const full = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
    if (full) {
      year = +full[1];
      mo = +full[2];
      da = +full[3];
    } else {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) return null;
      mo = d.getMonth() + 1;
      da = d.getDate();
      year = d.getFullYear();
    }
  }
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;

  const todayMid = new Date(now);
  todayMid.setHours(0, 0, 0, 0);
  let next = new Date(now.getFullYear(), mo - 1, da, 12, 0, 0, 0);
  if (next.getTime() < todayMid.getTime()) {
    next = new Date(now.getFullYear() + 1, mo - 1, da, 12, 0, 0, 0);
  }
  const turns = year != null ? next.getFullYear() - year : null;
  return { date: next, turns };
}

/**
 * Pure: derive the list of upcoming/overdue dated items from the store. Used by
 * the bell (full list) and fireDue (milestone subset). No DOM, no storage.
 */
export function computeFeed(items: StoredItem[], now: Date = new Date()): FeedNotif[] {
  const out: FeedNotif[] = [];

  const add = (
    cat: NotifCat,
    id: string,
    rawTitle: string | null,
    target: Date,
    meta: string | null,
    url: string,
    isReminder = false,
  ) => {
    const d = daysUntilLocal(now, target);
    if (d > UPCOMING_DAYS || d < OVERDUE_DAYS) return;
    const targetYmd = ymd(target);
    out.push({
      key: `${cat}:${id}:${bucketOf(d)}:${targetYmd}`,
      id,
      cat,
      title: rawTitle?.trim() || "Untitled",
      meta,
      url,
      targetYmd,
      daysUntil: d,
      isReminder,
    });
  };

  for (const it of items) {
    if (it.status === "archived") continue;
    const m = (it.metadata ?? {}) as Record<string, unknown>;

    if (it.kind === "task" && m.dueDate && !m.completedAt) {
      const due = new Date(m.dueDate as string);
      if (!Number.isNaN(due.getTime())) {
        add("task", it.id, it.title, due, null, `/items/${it.id}`, m.reminder === true);
      }
    }

    if (it.kind === "subscription" && m.paused !== true) {
      const sub = readSubscription(it);
      if (sub?.nextChargeAt) {
        const d = new Date(sub.nextChargeAt);
        if (!Number.isNaN(d.getTime())) {
          add(
            "subscription",
            it.id,
            it.title,
            d,
            formatMoney(sub.amount, sub.currency),
            "/subscriptions",
          );
        }
      }
    }

    if (it.kind === "project" && m.targetDate) {
      const d = new Date(m.targetDate as string);
      if (!Number.isNaN(d.getTime())) {
        add("deadline", it.id, it.title, d, null, `/items/${it.id}`);
      }
    }

    if (it.kind === "person" && typeof m.birthday === "string" && m.birthday) {
      const b = nextBirthday(m.birthday, now);
      if (b) {
        add(
          "birthday",
          it.id,
          it.title,
          b.date,
          b.turns != null ? `turns ${b.turns}` : null,
          `/items/${it.id}`,
        );
      }
    }
  }

  out.sort(
    (a, b) => a.daysUntil - b.daysUntil || a.title.localeCompare(b.title),
  );
  return out;
}

/* ── human-readable labels (shared by the bell + OS notifications) ────── */

export function whenLabel(daysUntil: number): string {
  if (daysUntil < 0) {
    return daysUntil === -1 ? "1 day overdue" : `${-daysUntil} days overdue`;
  }
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

const CAT_NOUN: Record<NotifCat, string> = {
  task: "Task",
  subscription: "Subscription",
  deadline: "Project deadline",
  birthday: "Birthday",
};

/** Bold primary line in the notification center. */
export function feedPrimary(n: FeedNotif): string {
  return n.cat === "birthday" ? `${n.title}'s birthday` : n.title;
}

/** Muted secondary line. */
export function feedSecondary(n: FeedNotif): string {
  const noun = CAT_NOUN[n.cat];
  return n.meta ? `${noun} · ${n.meta}` : noun;
}

/** Title + body for the native notification and the in-app toast. */
export function osText(n: FeedNotif): { title: string; body: string } {
  const when = whenLabel(n.daysUntil);
  switch (n.cat) {
    case "subscription":
      return {
        title: "💳 Subscription",
        body: `${n.title} renews ${when}${n.meta ? ` · ${n.meta}` : ""}`,
      };
    case "task":
      return { title: "⏰ Task", body: `${n.title} is due ${when}` };
    case "deadline":
      return { title: "🚩 Deadline", body: `${n.title} — deadline ${when}` };
    case "birthday":
      return { title: "🎂 Birthday", body: `It's ${n.title}'s birthday ${when}` };
  }
}

/* ── service-worker plumbing (unchanged) ─────────────────────────────── */

/** A service-worker registration with an ACTIVE worker, or null. */
async function activeRegistration(
  timeoutMs = 3000,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (reg?.active) return reg;
    if (!reg) reg = await navigator.serviceWorker.register("/sw.js");
    const ready = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((res) => setTimeout(() => res(null), timeoutMs)),
    ]);
    if (ready?.active) return ready;
    return reg?.active ? reg : null;
  } catch {
    return null;
  }
}

/**
 * Show one notification. Prefers the service worker so a click can focus the
 * app, and falls back to the page-level constructor when there's no active
 * worker. Throws if it genuinely can't display, so callers like the test button
 * can report the reason instead of failing silent.
 */
async function show(n: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}): Promise<void> {
  const opts: NotificationOptions = {
    body: n.body,
    tag: n.tag,
    data: { url: n.url ?? "/today" },
    icon: "/icon.svg",
    badge: "/icon.svg",
  };
  const reg = await activeRegistration();
  if (reg?.active) {
    await reg.showNotification(n.title, opts);
    return;
  }
  new Notification(n.title, opts);
}

/* ── firing ──────────────────────────────────────────────────────────── */

/** Notifications that fire at a specific clock time, not on a date milestone. */
function timeBased(
  items: StoredItem[],
  now: Date,
): Array<{ key: string; targetYmd: string; title: string; body: string; url: string }> {
  const out: Array<{
    key: string;
    targetYmd: string;
    title: string;
    body: string;
    url: string;
  }> = [];
  const today = ymd(now);
  const t = now.getTime();
  let habitsPending = 0;

  for (const it of items) {
    if (it.status === "archived") continue;
    const m = (it.metadata ?? {}) as Record<string, unknown>;

    // Reminder-type task — ping at its exact due time (90s catch window).
    if (it.kind === "task" && m.reminder === true && !m.completedAt && m.dueDate) {
      const due = new Date(m.dueDate as string).getTime();
      if (due <= t + 30_000 && due >= t - 90_000) {
        out.push({
          key: `reminder:${it.id}:${today}`,
          targetYmd: today,
          title: "⏰ Reminder",
          body: it.title ?? "Reminder",
          url: "/calendar",
        });
      }
    }

    if (it.kind === "habit") {
      const checkins = (m.checkins as string[] | undefined) ?? [];
      const cadence = (m.cadence as Cadence | undefined) ?? "daily";
      if (!checkins.includes(today)) habitsPending++;
      const rt = m.reminderTime as string | undefined;
      if (rt && isPending(checkins, cadence)) {
        const [hh, mm] = rt.split(":");
        const h = Number(hh);
        if (!Number.isNaN(h)) {
          const due = new Date(now);
          due.setHours(h, Number(mm) || 0, 0, 0);
          if (due.getTime() <= t + 30_000 && due.getTime() >= t - 90_000) {
            out.push({
              key: `habit:${it.id}:${today}`,
              targetYmd: today,
              title: `🔥 ${it.title ?? "Habit"}`,
              body: `Time for ${it.title ?? "your habit"}`,
              url: "/habits",
            });
          }
        }
      }
    }
  }

  if (now.getHours() >= 18 && habitsPending > 0) {
    out.push({
      key: `habits:${today}`,
      targetYmd: today,
      title: "🔥 Habits",
      body: `${habitsPending} habit${habitsPending > 1 ? "s" : ""} still to check off today`,
      url: "/habits",
    });
  }

  return out;
}

/** What `fireDue` returns so the bootstrap can raise matching in-app toasts. */
export type FiredNotif = { title: string; body: string; url: string };

/** Fire any newly-due notifications. Returns the ones that fired this tick. */
export async function fireDue(items: StoredItem[]): Promise<FiredNotif[]> {
  if (!notifyEnabled() || notifyPermission() !== "granted") return [];
  const now = new Date();
  pruneState(ymd(now));
  const cats = getCats();
  const fired = getFiredKeys();
  const fresh: FiredNotif[] = [];

  // Date milestones (5 / 3 / 1 / 0) for dated items.
  for (const n of computeFeed(items, now)) {
    if (!MILESTONES.includes(n.daysUntil)) continue;
    if (!cats[n.cat]) continue;
    // A reminder's same-day heads-up is left to its exact-time ping below.
    if (n.cat === "task" && n.isReminder && n.daysUntil === 0) continue;
    if (fired.has(n.key)) continue;
    const { title, body } = osText(n);
    try {
      await show({ title, body, tag: n.key, url: n.url });
    } catch {
      /* one failure shouldn't block the batch */
    }
    markFired(n.key, n.targetYmd);
    fresh.push({ title, body, url: n.url });
  }

  // Time-of-day notifications (reminders at their time, habits).
  for (const n of timeBased(items, now)) {
    if (fired.has(n.key)) continue;
    try {
      await show({ title: n.title, body: n.body, tag: n.key, url: n.url });
    } catch {
      /* ignore */
    }
    markFired(n.key, n.targetYmd);
    fresh.push({ title: n.title, body: n.body, url: n.url });
  }

  return fresh;
}

/**
 * Fire a test notification. Ensures permission first and throws a friendly,
 * specific message on failure so the UI can tell the user what to fix.
 */
export async function testNotification(): Promise<void> {
  if (!notifySupported()) {
    throw new Error("This browser doesn't support notifications.");
  }
  let p = notifyPermission();
  if (p === "default") p = await requestNotifyPermission();
  if (p !== "granted") {
    throw new Error(
      "Notifications are blocked. Allow them for this site in your browser, then try again.",
    );
  }
  try {
    await show({
      title: "Life OS",
      body: "Notifications are on — you'll be nudged 5, 3 and 1 days before, and on the day.",
      tag: "test",
      url: "/today",
    });
  } catch {
    throw new Error(
      "Couldn't display the notification — your OS may be muting it (e.g. Windows Focus Assist / Do Not Disturb).",
    );
  }
}
