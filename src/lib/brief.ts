/**
 * Daily brief — turns the live local data into a structured "today at a glance"
 * plus a flat fact summary the AI narrates. Pure functions; the page feeds them
 * the reactive data.
 */
import type {
  StoredItem,
  StoredNetWorthSnapshot,
  StoredHealthLog,
} from "@/lib/store/db";
import { ymd } from "@/lib/ymd";

export type BriefData = {
  dueToday: { id: string; title: string }[];
  overdue: number;
  remindersToday: { id: string; title: string; at: string }[];
  habits: { pending: number; total: number };
  renewals: { id: string; title: string; days: number }[];
  birthdays: { id: string; name: string }[];
  netWorth: { value: number; base: string; change: number } | null;
  goalsStale: { id: string; title: string; days: number }[];
  health: { sleep?: number; mood?: number } | null;
  captures: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function computeBrief(
  items: StoredItem[],
  snapshots: StoredNetWorthSnapshot[],
  health: StoredHealthLog[],
  now = new Date(),
): BriefData {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const today = ymd(now);
  const todayMD = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const t = now.getTime();

  const dueToday: BriefData["dueToday"] = [];
  const remindersToday: BriefData["remindersToday"] = [];
  const renewals: BriefData["renewals"] = [];
  const birthdays: BriefData["birthdays"] = [];
  const goalsStale: BriefData["goalsStale"] = [];
  let overdue = 0;
  let habitsPending = 0;
  let habitsTotal = 0;
  let captures = 0;

  for (const it of items) {
    if (it.capturedAt && new Date(it.capturedAt).getTime() >= t - 86_400_000) {
      captures++;
    }
    if (it.status === "archived") continue;
    const m = (it.metadata ?? {}) as Record<string, unknown>;

    if (it.kind === "task" && !m.completedAt) {
      const due = m.dueDate ? new Date(m.dueDate as string) : null;
      if (m.reminder === true) {
        if (due && due >= startOfToday && due < endOfToday) {
          remindersToday.push({
            id: it.id,
            title: it.title ?? "Reminder",
            at: due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
          });
        }
      } else if (due) {
        if (due < startOfToday) overdue++;
        else if (due < endOfToday) dueToday.push({ id: it.id, title: it.title ?? "Task" });
      }
    }

    if (it.kind === "habit") {
      habitsTotal++;
      const checkins = (m.checkins as string[] | undefined) ?? [];
      if (!checkins.includes(today)) habitsPending++;
    }

    if (it.kind === "subscription" && m.paused !== true && m.nextChargeAt) {
      const days = Math.ceil(
        (new Date(m.nextChargeAt as string).getTime() - startOfToday.getTime()) / 86_400_000,
      );
      if (days >= 0 && days <= 3) {
        renewals.push({ id: it.id, title: it.title ?? "Subscription", days });
      }
    }

    if (it.kind === "person" && typeof m.birthday === "string") {
      const d = /^\d{1,2}-\d{1,2}$/.test(m.birthday)
        ? m.birthday.split("-").map(Number)
        : (() => {
            const dt = new Date(m.birthday as string);
            return isNaN(dt.getTime()) ? null : [dt.getMonth() + 1, dt.getDate()];
          })();
      if (d && `${pad(d[0])}-${pad(d[1])}` === todayMD) {
        birthdays.push({ id: it.id, name: it.title ?? "Someone" });
      }
    }

    if (it.kind === "goal" && !m.achievedAt) {
      const updated = new Date(it.updatedAt).getTime();
      const days = Math.floor((t - updated) / 86_400_000);
      if (days >= 14) goalsStale.push({ id: it.id, title: it.title ?? "A goal", days });
    }
  }

  renewals.sort((a, b) => a.days - b.days);
  goalsStale.sort((a, b) => b.days - a.days);

  // net worth from snapshots
  let netWorth: BriefData["netWorth"] = null;
  if (snapshots.length > 0) {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];
    const base = sorted.filter((s) => s.base === latest.base);
    const weekAgo = ymd(new Date(t - 7 * 86_400_000));
    const prior = [...base].reverse().find((s) => s.date <= weekAgo) ?? base[0];
    netWorth = {
      value: latest.net,
      base: latest.base,
      change: prior ? ((latest.net - prior.net) / Math.abs(prior.net || 1)) * 100 : 0,
    };
  }

  // latest health log
  let healthOut: BriefData["health"] = null;
  if (health.length > 0) {
    const latest = [...health].sort((a, b) => a.date.localeCompare(b.date))[health.length - 1];
    if (latest && (latest.sleepHours != null || latest.mood != null)) {
      healthOut = { sleep: latest.sleepHours, mood: latest.mood };
    }
  }

  return {
    dueToday,
    overdue,
    remindersToday,
    habits: { pending: habitsPending, total: habitsTotal },
    renewals,
    birthdays,
    netWorth,
    goalsStale: goalsStale.slice(0, 4),
    health: healthOut,
    captures,
  };
}

/** Flat fact list the AI narrates. */
export function briefSummaryText(d: BriefData): string {
  const L: string[] = [];
  L.push(`Tasks due today: ${d.dueToday.length ? d.dueToday.map((x) => x.title).join(", ") : "none"}.`);
  if (d.overdue) L.push(`Overdue tasks: ${d.overdue}.`);
  if (d.remindersToday.length)
    L.push(`Reminders today: ${d.remindersToday.map((r) => `${r.title} at ${r.at}`).join(", ")}.`);
  L.push(`Habits: ${d.habits.pending} of ${d.habits.total} still to check off.`);
  if (d.renewals.length)
    L.push(`Renewing soon: ${d.renewals.map((r) => `${r.title} (${r.days === 0 ? "today" : `in ${r.days}d`})`).join(", ")}.`);
  if (d.birthdays.length) L.push(`Birthdays today: ${d.birthdays.map((b) => b.name).join(", ")}.`);
  if (d.netWorth)
    L.push(`Net worth ${Math.round(d.netWorth.value).toLocaleString()} ${d.netWorth.base}, ${d.netWorth.change >= 0 ? "up" : "down"} ${Math.abs(d.netWorth.change).toFixed(1)}% this week.`);
  if (d.goalsStale.length)
    L.push(`Goals not touched in a while: ${d.goalsStale.map((g) => `${g.title} (${g.days}d)`).join(", ")}.`);
  if (d.health)
    L.push(`Last health check-in: ${d.health.sleep != null ? `slept ${d.health.sleep}h` : ""}${d.health.sleep != null && d.health.mood != null ? ", " : ""}${d.health.mood != null ? `mood ${d.health.mood}/5` : ""}.`);
  L.push(`Captured ${d.captures} item${d.captures === 1 ? "" : "s"} in the last day.`);
  return L.join("\n");
}

export function briefIsEmpty(d: BriefData): boolean {
  return (
    d.dueToday.length === 0 &&
    d.overdue === 0 &&
    d.remindersToday.length === 0 &&
    d.habits.total === 0 &&
    d.renewals.length === 0 &&
    d.birthdays.length === 0 &&
    !d.netWorth &&
    d.goalsStale.length === 0 &&
    !d.health
  );
}
