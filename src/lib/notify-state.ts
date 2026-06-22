"use client";

/**
 * Persistent bits the notification system needs, kept out of notify.ts so the
 * scheduling logic there stays pure and testable.
 *
 *  - per-category prefs (which kinds the user wants notified)
 *  - `fired` — OS notifications already shown (so we don't re-ping)
 *  - `read`  — in-app center entries the user has seen (drives the bell badge)
 *
 * `fired`/`read` are maps of `key -> targetYMD`, so we can prune an entry the
 * day after its target date passes instead of letting them grow forever.
 */

export type NotifCat = "task" | "subscription" | "deadline" | "birthday";

export const NOTIF_CATS: NotifCat[] = [
  "task",
  "subscription",
  "deadline",
  "birthday",
];

export const CAT_LABEL: Record<NotifCat, string> = {
  task: "Tasks",
  subscription: "Subscriptions",
  deadline: "Deadlines",
  birthday: "Birthdays",
};

const CATS_KEY = "lifeos.notify.cats";
const READ_KEY = "lifeos.notify.read";
const FIRED_KEY = "lifeos.notify.fired";
const READ_EVENT = "lifeos:notify-read";

/* ── category prefs ──────────────────────────────────────────────────── */

export function getCats(): Record<NotifCat, boolean> {
  const out: Record<NotifCat, boolean> = {
    task: true,
    subscription: true,
    deadline: true,
    birthday: true,
  };
  try {
    const raw = JSON.parse(localStorage.getItem(CATS_KEY) ?? "{}");
    for (const c of NOTIF_CATS) if (raw?.[c] === false) out[c] = false;
  } catch {
    /* defaults */
  }
  return out;
}

export function setCat(cat: NotifCat, on: boolean): void {
  const cur = getCats();
  cur[cat] = on;
  try {
    localStorage.setItem(CATS_KEY, JSON.stringify(cur));
  } catch {
    /* ignore */
  }
}

/* ── date-keyed maps (read + fired) ──────────────────────────────────── */

type DateMap = Record<string, string>; // key -> targetYMD

function loadMap(k: string): DateMap {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as DateMap) : {};
  } catch {
    return {};
  }
}

function saveMap(k: string, m: DateMap): void {
  try {
    localStorage.setItem(k, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** Drop fired/read entries whose target date is before `today` (YYYY-MM-DD). */
export function pruneState(today: string): void {
  for (const k of [READ_KEY, FIRED_KEY]) {
    const m = loadMap(k);
    let changed = false;
    for (const [key, day] of Object.entries(m)) {
      if (day < today) {
        delete m[key];
        changed = true;
      }
    }
    if (changed) saveMap(k, m);
  }
}

/* fired — OS dedup */
export function getFiredKeys(): Set<string> {
  return new Set(Object.keys(loadMap(FIRED_KEY)));
}

export function markFired(key: string, targetYmd: string): void {
  const m = loadMap(FIRED_KEY);
  m[key] = targetYmd;
  saveMap(FIRED_KEY, m);
}

/* read — drives the bell's unread badge */
export function getReadKeys(): Set<string> {
  return new Set(Object.keys(loadMap(READ_KEY)));
}

export function markRead(entries: Array<{ key: string; targetYmd: string }>): void {
  if (entries.length === 0) return;
  const m = loadMap(READ_KEY);
  let changed = false;
  for (const e of entries) {
    if (m[e.key] !== e.targetYmd) {
      m[e.key] = e.targetYmd;
      changed = true;
    }
  }
  if (changed) {
    saveMap(READ_KEY, m);
    try {
      window.dispatchEvent(new Event(READ_EVENT));
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to read-state changes (this tab and others). Returns an unsub. */
export function onReadChange(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(READ_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(READ_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
