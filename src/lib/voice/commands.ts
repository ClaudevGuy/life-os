"use client";

/**
 * Client glue for the voice assistant. Mirrors lib/ask.ts but for *control*:
 *
 * - buildSnapshot(): a compact, readable summary of the user's data so the model
 *   can answer "what's due today / how many tasks / who's in my people list".
 * - streamCommand(): calls /api/ai/command and dispatches the NDJSON stream.
 * - executeCommand(): runs the model's tool calls against the live app —
 *   navigation, completing tasks, the focus timer, theme, search — and falls
 *   back to lib/ask's executeAction for the "create X" tools.
 */
import { db } from "@/lib/store/db";
import { aiHeaders } from "@/lib/ai-key";
import { setTaskDone } from "@/lib/store/items";
import { ymd } from "@/lib/ymd";
import {
  executeAction,
  type AskAction,
  type AppliedAction,
} from "@/lib/ask";
import { digestPage } from "@/lib/voice/digest";
import type { StoredItem } from "@/lib/store/db";

export type { AppliedAction } from "@/lib/ask";

/** An applied action, optionally carrying extra prose to read aloud. */
export type CommandResult = AppliedAction & { speech?: string };

export type Turn = { role: "user" | "assistant"; text: string };

// ── Snapshot ──────────────────────────────────────────────────────────────────

function fmtDue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return "";
  const ap = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return ` at ${hh}${m ? `:${String(m).padStart(2, "0")}` : ""}${ap}`;
}

/** A readable snapshot the model can reason over. Capped so it stays compact. */
export async function buildSnapshot(): Promise<string> {
  const all = await db.items.orderBy("capturedAt").reverse().toArray();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const today = ymd(start);

  const openTasks: StoredItem[] = [];
  const overdue: string[] = [];
  const dueToday: string[] = [];
  const remindersToday: string[] = [];
  let inbox = 0;
  let habitsTotal = 0;
  let habitsDone = 0;
  const people: string[] = [];
  const accounts: string[] = [];
  const holdings: string[] = [];
  const recent: string[] = [];

  for (const it of all) {
    const m = (it.metadata ?? {}) as Record<string, unknown>;
    if (it.status === "inbox") inbox++;

    if (it.kind === "task") {
      const done = Boolean(m.completedAt) || it.status === "archived";
      const due = m.dueDate as string | undefined;
      if (m.reminder === true) {
        if (due && new Date(due) >= start && new Date(due) < end && !done) {
          remindersToday.push(`${it.title ?? "reminder"}${fmtDue(due)}`);
        }
        continue;
      }
      if (!done) {
        openTasks.push(it);
        if (due) {
          const d = new Date(due);
          if (d < start) overdue.push(it.title ?? "untitled");
          else if (d < end) dueToday.push(`${it.title ?? "untitled"}${fmtDue(due)}`);
        }
      }
    } else if (it.kind === "habit") {
      habitsTotal++;
      const checkins = (m.checkins as string[] | undefined) ?? [];
      if (checkins.includes(today)) habitsDone++;
    } else if (it.kind === "person" && people.length < 25) {
      if (it.title) people.push(it.title);
    } else if (it.kind === "account" && accounts.length < 12) {
      const bal = typeof m.balance === "number" ? m.balance : null;
      const cur = (m.currency as string) ?? "USD";
      const t = m.accountType === "liability" ? "owe" : "have";
      if (it.title && bal != null)
        accounts.push(`${it.title}: ${t} ${bal} ${cur}`);
    } else if (it.kind === "holding" && holdings.length < 12) {
      const qty = typeof m.quantity === "number" ? m.quantity : "";
      if (m.symbol) holdings.push(`${qty} ${String(m.symbol).toUpperCase()}`.trim());
    }
    if (
      recent.length < 8 &&
      ["note", "highlight", "journal", "project", "goal", "bookmark"].includes(
        it.kind,
      ) &&
      it.title
    ) {
      recent.push(`${it.kind}: ${it.title}`);
    }
  }

  const topTasks = openTasks
    .slice(0, 10)
    .map((t) => t.title ?? "untitled")
    .filter(Boolean);

  const lines: string[] = [];
  lines.push(
    `Counts: ${openTasks.length} open tasks (${overdue.length} overdue, ${dueToday.length} due today), ${inbox} in inbox, habits ${habitsDone}/${habitsTotal} done today.`,
  );
  if (dueToday.length) lines.push(`Due today: ${dueToday.join("; ")}.`);
  if (remindersToday.length)
    lines.push(`Reminders today: ${remindersToday.join("; ")}.`);
  if (overdue.length)
    lines.push(`Overdue: ${overdue.slice(0, 12).join("; ")}.`);
  if (topTasks.length) lines.push(`Open tasks: ${topTasks.join("; ")}.`);
  if (people.length) lines.push(`People: ${people.join(", ")}.`);
  if (accounts.length) lines.push(`Accounts: ${accounts.join("; ")}.`);
  if (holdings.length) lines.push(`Holdings: ${holdings.join(", ")}.`);
  if (recent.length) lines.push(`Recent items: ${recent.join("; ")}.`);

  return lines.join("\n");
}

// ── Streaming the command ──────────────────────────────────────────────────────

export type CommandCallbacks = {
  onText?: (delta: string) => void;
  onAction?: (a: AskAction) => void | Promise<void>;
  onError?: (message: string) => void;
  signal?: AbortSignal;
};

export async function streamCommand(
  transcript: string,
  history: Turn[],
  cb: CommandCallbacks,
): Promise<void> {
  let context = "";
  try {
    context = await buildSnapshot();
  } catch {
    /* no snapshot — model can still act */
  }

  let res: Response;
  try {
    res = await fetch("/api/ai/command", {
      method: "POST",
      headers: aiHeaders(),
      signal: cb.signal,
      body: JSON.stringify({ transcript, context, history: history.slice(-6) }),
    });
  } catch {
    cb.onError?.("Couldn't reach the assistant.");
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    cb.onError?.(
      detail?.error === "ai_unavailable"
        ? "No AI key set. Add one in Settings → AI to use voice commands."
        : "Couldn't reach the assistant.",
    );
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let evt:
        | { type: "text"; text: string }
        | { type: "action"; name: string; input?: Record<string, unknown> }
        | { type: "error"; message?: string };
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }
      if (evt.type === "text") cb.onText?.(evt.text);
      else if (evt.type === "action")
        await cb.onAction?.({ name: evt.name, input: evt.input ?? {} });
      else if (evt.type === "error")
        cb.onError?.(evt.message || "Something went wrong.");
    }
  }
}

// ── Executing control actions ──────────────────────────────────────────────────

const NAV: Record<string, { href: string; label: string }> = {
  today: { href: "/today", label: "Today" },
  inbox: { href: "/inbox", label: "Inbox" },
  notes: { href: "/notes", label: "Notes" },
  bookmarks: { href: "/bookmarks", label: "Bookmarks" },
  files: { href: "/files", label: "Files" },
  calendar: { href: "/calendar", label: "Calendar" },
  tasks: { href: "/tasks", label: "Tasks" },
  habits: { href: "/habits", label: "Habits" },
  health: { href: "/health", label: "Health" },
  goals: { href: "/goals", label: "Goals" },
  projects: { href: "/projects", label: "Projects" },
  people: { href: "/people", label: "People" },
  finance: { href: "/finance", label: "Finance" },
  subscriptions: { href: "/subscriptions", label: "Subscriptions" },
  ask: { href: "/ask", label: "Ask my notes" },
  graph: { href: "/graph", label: "Connections" },
  music: { href: "/music", label: "Music" },
  vault: { href: "/vault", label: "Vault" },
  settings: { href: "/settings", label: "Settings" },
};

export type CommandCtx = { navigate: (href: string) => void };

function s(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function n(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && isFinite(Number(v))) return Number(v);
  return null;
}

function bestMatch(rows: StoredItem[], needle: string): StoredItem | null {
  const q = needle.toLowerCase().trim();
  if (!q) return null;
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  let best: StoredItem | null = null;
  let bestScore = 0;
  for (const r of rows) {
    const title = (r.title ?? "").toLowerCase();
    if (!title) continue;
    let score = 0;
    if (title === q) score = 100;
    else if (title.includes(q)) score = 60 + Math.min(20, q.length);
    else score = words.filter((w) => title.includes(w)).length * 12;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return bestScore > 0 ? best : null;
}

async function findOpenTask(query?: string): Promise<StoredItem | null> {
  if (!query) return null;
  const rows = await db.items.where("kind").equals("task").toArray();
  const open = rows.filter((r) => {
    const m = (r.metadata ?? {}) as Record<string, unknown>;
    return (
      m.reminder !== true && !m.completedAt && r.status !== "archived"
    );
  });
  return bestMatch(open, query);
}

async function findItem(query?: string): Promise<StoredItem | null> {
  if (!query) return null;
  const rows = await db.items.toArray();
  return bestMatch(rows, query);
}

function applyTheme(mode: "light" | "dark"): void {
  try {
    document.documentElement.dataset.theme = mode;
    window.localStorage.setItem("lifeos.theme", mode);
    window.dispatchEvent(new CustomEvent("lifeos:theme", { detail: { mode } }));
  } catch {
    /* ignore */
  }
}

function snapFocus(minutes: number): 15 | 25 | 50 | 90 {
  if (minutes <= 19) return 15;
  if (minutes <= 37) return 25;
  if (minutes <= 70) return 50;
  return 90;
}

/**
 * Run one tool call. Control actions manipulate the app (returning a confirmation
 * with no href); the "create X" tools fall through to lib/ask's executeAction.
 */
export async function executeCommand(
  a: AskAction,
  ctx: CommandCtx,
): Promise<CommandResult | null> {
  const i = a.input ?? {};
  try {
    switch (a.name) {
      case "readPage": {
        const key = String(i.page ?? "");
        const digest = await digestPage(key);
        if (!digest) return null;
        // Show the page while reading it out.
        const dest = NAV[key];
        if (dest) ctx.navigate(dest.href);
        return {
          label: `Read ${digest.title}`,
          sub: null,
          href: dest?.href ?? "",
          speech: digest.speech,
        };
      }
      case "navigate": {
        const dest = NAV[String(i.to)];
        if (!dest) return null;
        ctx.navigate(dest.href);
        return { label: `Opened ${dest.label}`, sub: null, href: dest.href };
      }
      case "openItem": {
        const item = await findItem(s(i.query));
        if (!item) return null;
        const href = `/items/${item.id}`;
        ctx.navigate(href);
        return { label: `Opened ${item.title ?? "item"}`, sub: null, href };
      }
      case "completeTask": {
        const task = await findOpenTask(s(i.query));
        if (!task) return null;
        await setTaskDone(task.id, true);
        return {
          label: "Marked done",
          sub: task.title ?? null,
          href: "/tasks",
        };
      }
      case "startFocus": {
        const mins = snapFocus(n(i.minutes) ?? 25);
        window.dispatchEvent(
          new CustomEvent("lifeos:start-focus", { detail: { minutes: mins } }),
        );
        return { label: "Focus timer started", sub: `${mins} minutes`, href: "" };
      }
      case "setTheme": {
        const mode = i.mode === "light" ? "light" : "dark";
        applyTheme(mode);
        return {
          label: `Switched to ${mode} mode`,
          sub: null,
          href: "",
        };
      }
      case "search": {
        const query = s(i.query) ?? "";
        window.dispatchEvent(
          new CustomEvent("lifeos:open-search", { detail: { query } }),
        );
        return { label: "Opened search", sub: query || null, href: "" };
      }
      default:
        // create-style tools (addTask, addReminder, addNote, …)
        return executeAction(a);
    }
  } catch {
    return null;
  }
}
