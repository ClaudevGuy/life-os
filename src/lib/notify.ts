"use client";

/**
 * Local notifications. Life OS has no push server, so these fire while the app
 * is open (a 60s scheduler in PwaBootstrap) — reminders as they come due,
 * renewals/birthdays/pending-habits as a once-a-day nudge. Shown via the
 * service worker so a click focuses the app.
 */
import type { StoredItem } from "@/lib/store/db";
import { ymd } from "@/lib/ymd";

const ENABLED_KEY = "lifeos.notify.enabled";
const FIRED_KEY = "lifeos.notify.fired";

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

export type Notif = { key: string; title: string; body: string; url: string };

const pad = (n: number) => String(n).padStart(2, "0");

function birthdayMD(s: string): string | null {
  if (/^\d{1,2}-\d{1,2}$/.test(s)) {
    const [mo, da] = s.split("-");
    return `${pad(+mo)}-${pad(+da)}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return null;
}

export function dueNotifications(items: StoredItem[], now = new Date()): Notif[] {
  const out: Notif[] = [];
  const today = ymd(now);
  const todayMD = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const t = now.getTime();
  let habitsPending = 0;

  for (const it of items) {
    const m = (it.metadata ?? {}) as Record<string, unknown>;
    if (it.status === "archived") continue;

    if (it.kind === "task" && m.reminder === true && !m.completedAt && m.dueDate) {
      const due = new Date(m.dueDate as string).getTime();
      // Just came due (within a 90s window so the 60s scheduler catches it once).
      if (due <= t + 30_000 && due >= t - 90_000) {
        out.push({
          key: `reminder:${it.id}`,
          title: "⏰ Reminder",
          body: it.title ?? "Reminder",
          url: "/calendar",
        });
      }
    }

    if (it.kind === "subscription" && m.paused !== true && m.nextChargeAt) {
      if (ymd(new Date(m.nextChargeAt as string)) === today) {
        out.push({
          key: `renewal:${it.id}:${today}`,
          title: "💳 Renews today",
          body: `${it.title ?? "A subscription"} renews today`,
          url: "/subscriptions",
        });
      }
    }

    if (it.kind === "person" && typeof m.birthday === "string" && m.birthday) {
      const md = birthdayMD(m.birthday);
      if (md && md === todayMD) {
        out.push({
          key: `birthday:${it.id}:${today}`,
          title: "🎂 Birthday",
          body: `It's ${it.title ?? "someone"}'s birthday today`,
          url: `/items/${it.id}`,
        });
      }
    }

    if (it.kind === "habit") {
      const checkins = (m.checkins as string[] | undefined) ?? [];
      if (!checkins.includes(today)) habitsPending++;
    }
  }

  if (now.getHours() >= 18 && habitsPending > 0) {
    out.push({
      key: `habits:${today}`,
      title: "🔥 Habits",
      body: `${habitsPending} habit${habitsPending > 1 ? "s" : ""} still to check off today`,
      url: "/habits",
    });
  }

  return out;
}

function loadFired(): { day: string; keys: string[] } {
  try {
    const r = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}");
    return { day: r.day ?? "", keys: Array.isArray(r.keys) ? r.keys : [] };
  } catch {
    return { day: "", keys: [] };
  }
}
function saveFired(f: { day: string; keys: string[] }): void {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(f));
  } catch {
    /* ignore */
  }
}

async function show(n: { title: string; body: string; tag?: string; url?: string }) {
  const opts: NotificationOptions = {
    body: n.body,
    tag: n.tag,
    data: { url: n.url ?? "/today" },
    icon: "/icon.svg",
    badge: "/icon.svg",
  };
  try {
    const reg =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : null;
    if (reg && "showNotification" in reg) {
      await reg.showNotification(n.title, opts);
    } else {
      new Notification(n.title, opts);
    }
  } catch {
    /* ignore */
  }
}

/** Fire any newly-due notifications (deduped within the day). */
export async function fireDue(items: StoredItem[]): Promise<void> {
  if (!notifyEnabled() || notifyPermission() !== "granted") return;
  const today = ymd(new Date());
  let fired = loadFired();
  if (fired.day !== today) fired = { day: today, keys: [] };
  const due = dueNotifications(items);
  const fresh = due.filter((n) => !fired.keys.includes(n.key));
  for (const n of fresh) {
    await show(n);
    fired.keys.push(n.key);
  }
  saveFired(fired);
}

export async function testNotification(): Promise<void> {
  await show({
    title: "Life OS",
    body: "Notifications are on — you'll be nudged about reminders, renewals and birthdays.",
    tag: "test",
    url: "/today",
  });
}
