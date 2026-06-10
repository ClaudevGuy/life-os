"use client";

/**
 * Spoken page digests for the voice assistant. When the user asks "what's on
 * my finance page" / "read me my tasks", the model calls the readPage tool and
 * the client composes the rundown HERE, from the live local data — so what's
 * read aloud is exact, not a model paraphrase.
 *
 * Each digest returns natural prose meant for text-to-speech: short sentences,
 * no symbols that read badly aloud.
 */
import { db } from "@/lib/store/db";
import { ymd } from "@/lib/ymd";
import { fmtMoney } from "@/lib/finance";
import { readSubscription, monthlyEquivalent } from "@/lib/subscriptions";
import type { StoredItem } from "@/lib/store/db";

export type PageDigest = { title: string; speech: string };

const PAGE_TITLES: Record<string, string> = {
  today: "Today",
  tasks: "Tasks",
  inbox: "Inbox",
  calendar: "Calendar",
  habits: "Habits",
  health: "Health",
  goals: "Goals",
  projects: "Projects",
  people: "People",
  finance: "Finance",
  subscriptions: "Subscriptions",
  notes: "Notes",
  bookmarks: "Bookmarks",
};

function meta(it: StoredItem): Record<string, unknown> {
  return (it.metadata ?? {}) as Record<string, unknown>;
}

function taskOpen(it: StoredItem): boolean {
  const m = meta(it);
  return m.reminder !== true && !m.completedAt && it.status !== "archived";
}

function listNames(items: Array<string | null>, max: number): string {
  const names = items.filter((t): t is string => Boolean(t)).slice(0, max);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function timeOf(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return "";
  const ap = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? ` at ${hh} ${ap}` : ` at ${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export async function digestPage(page: string): Promise<PageDigest | null> {
  const title = PAGE_TITLES[page];
  if (!title) return null;
  const all = await db.items.toArray();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const todayKey = ymd(start);
  const inWindow = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= start && d < end;
  };

  switch (page) {
    case "tasks": {
      const open = all.filter((i) => i.kind === "task" && taskOpen(i));
      if (open.length === 0)
        return { title, speech: "Your task list is clear. Nothing open." };
      const overdue = open.filter((i) => {
        const due = meta(i).dueDate as string | undefined;
        return due ? new Date(due) < start : false;
      });
      const dueToday = open.filter((i) => inWindow(meta(i).dueDate as string | undefined));
      const parts = [
        `You have ${open.length} open task${open.length === 1 ? "" : "s"}.`,
      ];
      if (overdue.length)
        parts.push(
          `${overdue.length} overdue: ${listNames(overdue.map((i) => i.title), 4)}.`,
        );
      if (dueToday.length)
        parts.push(
          `Due today: ${listNames(dueToday.map((i) => i.title), 4)}.`,
        );
      const rest = open.filter((i) => !overdue.includes(i) && !dueToday.includes(i));
      if (rest.length)
        parts.push(`Also on the list: ${listNames(rest.map((i) => i.title), 4)}.`);
      return { title, speech: parts.join(" ") };
    }

    case "today": {
      const open = all.filter((i) => i.kind === "task" && taskOpen(i));
      const dueToday = open.filter((i) => inWindow(meta(i).dueDate as string | undefined));
      const overdue = open.filter((i) => {
        const due = meta(i).dueDate as string | undefined;
        return due ? new Date(due) < start : false;
      });
      const reminders = all.filter(
        (i) =>
          i.kind === "task" &&
          meta(i).reminder === true &&
          !meta(i).completedAt &&
          i.status !== "archived" &&
          inWindow(meta(i).dueDate as string | undefined),
      );
      const habits = all.filter((i) => i.kind === "habit" && i.status !== "archived");
      const habitsDone = habits.filter((i) =>
        ((meta(i).checkins as string[] | undefined) ?? []).includes(todayKey),
      ).length;
      const inboxCount = all.filter((i) => i.status === "inbox").length;
      const parts: string[] = [];
      parts.push(
        dueToday.length
          ? `${dueToday.length} task${dueToday.length === 1 ? " is" : "s are"} due today: ${listNames(dueToday.map((i) => i.title), 4)}.`
          : "No tasks are due today.",
      );
      if (overdue.length) parts.push(`${overdue.length} overdue.`);
      if (reminders.length)
        parts.push(
          `Reminders: ${listNames(
            reminders.map((i) => `${i.title ?? "reminder"}${timeOf(meta(i).dueDate as string | undefined)}`),
            4,
          )}.`,
        );
      if (habits.length) parts.push(`Habits: ${habitsDone} of ${habits.length} done.`);
      if (inboxCount) parts.push(`${inboxCount} item${inboxCount === 1 ? "" : "s"} waiting in the inbox.`);
      return { title, speech: parts.join(" ") };
    }

    case "inbox": {
      const inbox = all
        .filter((i) => i.status === "inbox")
        .sort((a, b) => +new Date(b.capturedAt) - +new Date(a.capturedAt));
      if (inbox.length === 0)
        return { title, speech: "Inbox zero. Nothing to triage." };
      return {
        title,
        speech: `${inbox.length} item${inbox.length === 1 ? "" : "s"} to triage. Newest: ${listNames(inbox.map((i) => i.title), 5)}.`,
      };
    }

    case "calendar": {
      const dated = all.filter(
        (i) =>
          i.kind === "task" &&
          !meta(i).completedAt &&
          i.status !== "archived" &&
          inWindow(meta(i).dueDate as string | undefined),
      );
      if (dated.length === 0)
        return { title, speech: "Nothing scheduled for today." };
      return {
        title,
        speech: `On today: ${listNames(
          dated.map((i) => `${i.title ?? "untitled"}${timeOf(meta(i).dueDate as string | undefined)}`),
          6,
        )}.`,
      };
    }

    case "habits": {
      const habits = all.filter((i) => i.kind === "habit" && i.status !== "archived");
      if (habits.length === 0)
        return { title, speech: "No habits tracked yet." };
      const done: string[] = [];
      const pending: string[] = [];
      let bestStreak = 0;
      let bestName = "";
      for (const h of habits) {
        const checkins = (meta(h).checkins as string[] | undefined) ?? [];
        (checkins.includes(todayKey) ? done : pending).push(h.title ?? "habit");
        const set = new Set(checkins);
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = ymd(new Date(Date.now() - i * 86_400_000));
          if (set.has(d)) streak++;
          else if (i === 0) continue;
          else break;
        }
        if (streak > bestStreak) {
          bestStreak = streak;
          bestName = h.title ?? "a habit";
        }
      }
      const parts = [`${done.length} of ${habits.length} habits done today.`];
      if (pending.length) parts.push(`Still to do: ${listNames(pending, 4)}.`);
      if (bestStreak > 1) parts.push(`Best streak: ${bestStreak} days on ${bestName}.`);
      return { title, speech: parts.join(" ") };
    }

    case "health": {
      const logs = await db.healthLogs.orderBy("date").reverse().limit(1).toArray();
      const log = logs[0];
      if (!log) return { title, speech: "No health logs yet." };
      const bits: string[] = [];
      if (typeof log.sleepHours === "number") bits.push(`${log.sleepHours} hours of sleep`);
      if (typeof log.mood === "number") bits.push(`mood ${log.mood} out of 5`);
      if (typeof log.energy === "number") bits.push(`energy ${log.energy} out of 5`);
      if (typeof log.weightKg === "number") bits.push(`weight ${log.weightKg} kilos`);
      if (typeof log.activeMin === "number") bits.push(`${log.activeMin} active minutes`);
      if (typeof log.water === "number") bits.push(`${log.water} glasses of water`);
      const when = log.date === todayKey ? "Today" : `On ${log.date}`;
      return {
        title,
        speech: bits.length
          ? `${when}: ${bits.join(", ")}.`
          : `${when} has a log, but no numbers were recorded.`,
      };
    }

    case "goals":
    case "projects": {
      const kind = page === "goals" ? "goal" : "project";
      const rows = all.filter((i) => i.kind === kind && i.status !== "archived");
      if (rows.length === 0) return { title, speech: `No ${page} yet.` };
      return {
        title,
        speech: `${rows.length} ${page === "goals" ? "goal" : "project"}${rows.length === 1 ? "" : "s"}: ${listNames(rows.map((i) => i.title), 6)}.`,
      };
    }

    case "people": {
      const rows = all.filter((i) => i.kind === "person" && i.status !== "archived");
      if (rows.length === 0) return { title, speech: "No people saved yet." };
      return {
        title,
        speech: `${rows.length} ${rows.length === 1 ? "person" : "people"}: ${listNames(rows.map((i) => i.title), 8)}.`,
      };
    }

    case "finance": {
      const snaps = await db.netWorthSnapshots.orderBy("date").reverse().limit(1).toArray();
      const snap = snaps[0];
      const accounts = all.filter((i) => i.kind === "account" && i.status !== "archived");
      const holdings = all.filter((i) => i.kind === "holding" && i.status !== "archived");
      const parts: string[] = [];
      if (snap) {
        parts.push(
          `Net worth is about ${fmtMoney(snap.net, snap.base, { compact: true })} — ${fmtMoney(snap.assets, snap.base, { compact: true })} in assets and ${fmtMoney(snap.liabilities, snap.base, { compact: true })} in liabilities.`,
        );
      }
      if (accounts.length) {
        const lines = accounts.slice(0, 5).map((a) => {
          const m = meta(a);
          const bal = typeof m.balance === "number" ? m.balance : 0;
          const cur = (m.currency as string) ?? "USD";
          return `${a.title} ${m.accountType === "liability" ? "owing" : "at"} ${fmtMoney(bal, cur, { compact: true })}`;
        });
        parts.push(`Accounts: ${lines.join("; ")}.`);
      }
      if (holdings.length) {
        const names = holdings.slice(0, 6).map((h) => {
          const m = meta(h);
          const qty = typeof m.quantity === "number" ? m.quantity : "";
          return `${qty} ${String(m.symbol ?? "").toUpperCase()}`.trim();
        });
        parts.push(`Holdings: ${names.join(", ")}.`);
      }
      if (parts.length === 0)
        return { title, speech: "The finance page is empty so far — no accounts or holdings yet." };
      return { title, speech: parts.join(" ") };
    }

    case "subscriptions": {
      const subs = all.filter((i) => i.kind === "subscription" && i.status !== "archived");
      if (subs.length === 0) return { title, speech: "No subscriptions tracked." };
      let monthly = 0;
      let currency = "USD";
      let priced = 0;
      for (const s of subs) {
        const m = readSubscription(s);
        if (m && !m.paused) {
          monthly += monthlyEquivalent(m.amount, m.cycle);
          currency = m.currency || currency;
          priced++;
        }
      }
      const parts = [
        `${subs.length} subscription${subs.length === 1 ? "" : "s"}: ${listNames(subs.map((i) => i.title), 6)}.`,
      ];
      if (priced)
        parts.push(`Roughly ${fmtMoney(monthly, currency, { compact: true })} a month.`);
      return { title, speech: parts.join(" ") };
    }

    case "notes":
    case "bookmarks": {
      const kind = page === "notes" ? "note" : "bookmark";
      const rows = all
        .filter((i) => i.kind === kind)
        .sort((a, b) => +new Date(b.capturedAt) - +new Date(a.capturedAt));
      if (rows.length === 0) return { title, speech: `No ${page} yet.` };
      return {
        title,
        speech: `${rows.length} ${page}. Most recent: ${listNames(rows.map((i) => i.title), 5)}.`,
      };
    }

    default:
      return null;
  }
}
