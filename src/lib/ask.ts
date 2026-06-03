"use client";

/**
 * Client-side glue for "Ask my notes". Shared by the full /ask page and the
 * top-bar popover.
 *
 * - streamAsk(): picks local context from IndexedDB, calls /api/ai/ask, and
 *   dispatches the NDJSON stream (sources / text / action / error) to callbacks.
 * - executeAction(): the model's tool calls have no server execute — the data
 *   lives here in the browser, so we perform the write and return a confirmation.
 */
import { db } from "@/lib/store/db";
import { aiHeaders } from "@/lib/ai-key";
import { captureItem } from "@/lib/store/items";
import { detectPlatform, normalizeUrl } from "@/lib/bookmarks";
import {
  COIN_CATALOG,
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  fmtMoney,
  fmtQty,
  type AccountType,
} from "@/lib/finance";

export type Source = {
  id: string;
  kind: string;
  title: string | null;
  summary: string | null;
};

export type AskAction = { name: string; input: Record<string, unknown> };

export type AppliedAction = { label: string; sub: string | null; href: string };

export type AskCallbacks = {
  onSources?: (s: Source[]) => void;
  onText?: (delta: string) => void;
  onAction?: (a: AskAction) => void | Promise<void>;
  onError?: (message: string) => void;
  signal?: AbortSignal;
};

export async function streamAsk(
  question: string,
  cb: AskCallbacks,
): Promise<void> {
  // Local context: keyword match against everything captured, else recent 8.
  const needle = question.toLowerCase();
  const all = await db.items.orderBy("capturedAt").reverse().toArray();
  let context = all
    .filter((i) => {
      const hay = [i.title, i.summary, i.body, i.topic, ...(i.keyPoints ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, 8);
  if (context.length === 0) context = all.slice(0, 8);

  let res: Response;
  try {
    res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: aiHeaders(),
      signal: cb.signal,
      body: JSON.stringify({
        question,
        items: context.map((i) => ({
          id: i.id,
          kind: i.kind,
          title: i.title,
          summary: i.summary,
          body: i.body?.slice(0, 1000) ?? null,
        })),
      }),
    });
  } catch {
    cb.onError?.("Couldn't reach the AI service.");
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await res.json().catch(() => null);
    if (detail?.sources) cb.onSources?.(detail.sources);
    cb.onError?.(
      detail?.error === "ai_unavailable"
        ? "No AI key set, or the model is unreachable. Add a key in Settings → AI."
        : "Couldn't reach the AI service.",
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
        | { type: "sources"; sources: Source[] }
        | { type: "text"; text: string }
        | { type: "action"; name: string; input?: Record<string, unknown> }
        | { type: "error"; message?: string };
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }
      if (evt.type === "sources") cb.onSources?.(evt.sources);
      else if (evt.type === "text") cb.onText?.(evt.text);
      else if (evt.type === "action")
        await cb.onAction?.({ name: evt.name, input: evt.input ?? {} });
      else if (evt.type === "error")
        cb.onError?.(evt.message || "Something went wrong.");
    }
  }
}

// ── Executing the model's actions against the local store ─────────────────

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v)))
    return Number(v);
  return null;
}

function toISO(date?: string, time?: string): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const t = /^\d{1,2}:\d{2}$/.test(time ?? "") ? (time as string) : "09:00";
  const [h, m] = t.split(":");
  const d = new Date(`${date}T${h.padStart(2, "0")}:${m}:00`);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

export async function executeAction(
  a: AskAction,
): Promise<AppliedAction | null> {
  const i = a.input ?? {};
  try {
    switch (a.name) {
      case "addReminder": {
        const title = str(i.title);
        if (!title) return null;
        const due = toISO(str(i.date), str(i.time)) ?? new Date().toISOString();
        await captureItem({
          kind: "task",
          title,
          status: "active",
          metadata: {
            dueDate: due,
            priority: "medium",
            completedAt: null,
            reminder: true,
          },
        });
        return {
          label: "Reminder set",
          sub: `${title} · ${friendlyDate(due)}`,
          href: "/calendar",
        };
      }
      case "addTask": {
        const title = str(i.title);
        if (!title) return null;
        const due = toISO(str(i.dueDate), "09:00");
        const priority = ["low", "medium", "high"].includes(String(i.priority))
          ? (i.priority as string)
          : "medium";
        await captureItem({
          kind: "task",
          title,
          status: due ? "active" : "inbox",
          metadata: { dueDate: due, priority, completedAt: null },
        });
        return {
          label: "Task added",
          sub: due ? `${title} · ${friendlyDate(due)}` : title,
          href: "/tasks",
        };
      }
      case "addPerson": {
        const name = str(i.name);
        if (!name) return null;
        const person = await captureItem({
          kind: "person",
          title: name,
          body: str(i.note) ?? null,
          status: "active",
          metadata: {
            phone: str(i.phone),
            email: str(i.email),
            relationship: str(i.relationship),
          },
        });
        const bits = [str(i.phone), str(i.email)].filter(Boolean).join(" · ");
        return {
          label: "Person added",
          sub: bits ? `${name} · ${bits}` : name,
          href: `/items/${person.id}`,
        };
      }
      case "addNote": {
        const title = str(i.title);
        if (!title && !str(i.body)) return null;
        const note = await captureItem({
          kind: "note",
          title: title ?? "Untitled note",
          body: str(i.body) ?? null,
          status: "inbox",
        });
        return {
          label: "Note saved",
          sub: title ?? "Untitled note",
          href: `/items/${note.id}`,
        };
      }
      case "addBookmark": {
        const url = normalizeUrl(str(i.url) ?? "");
        if (!url) return null;
        const detected = detectPlatform(url);
        await captureItem({
          kind: "bookmark",
          title: str(i.title) ?? detected.host,
          sourceUrl: url,
          status: "active",
          metadata: {
            url,
            platform: detected.name,
            host: detected.host,
            color: detected.color,
            tags: [],
          },
        });
        return {
          label: "Bookmark saved",
          sub: `${str(i.title) ?? detected.host}`,
          href: "/bookmarks",
        };
      }
      case "addAccount": {
        const name = str(i.name);
        const balance = num(i.balance);
        if (!name || balance == null) return null;
        const accountType: AccountType =
          i.accountType === "liability" ? "liability" : "asset";
        const cats =
          accountType === "asset" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
        const wanted = str(i.category)?.toLowerCase();
        const category =
          (cats as readonly string[]).find((c) => c.toLowerCase() === wanted) ??
          (accountType === "asset" ? "Cash" : "Other debt");
        const currency = (str(i.currency) ?? "USD").toUpperCase();
        const amount = Math.abs(balance);
        await captureItem({
          kind: "account",
          title: name,
          status: "active",
          metadata: {
            accountType,
            category,
            balance: amount,
            currency,
            institution: str(i.institution),
          },
        });
        return {
          label: accountType === "asset" ? "Account added" : "Debt added",
          sub: `${name} · ${fmtMoney(amount, currency)}`,
          href: "/finance",
        };
      }
      case "addHolding": {
        const symbolRaw = str(i.symbol);
        const quantity = num(i.quantity);
        if (!symbolRaw || quantity == null || quantity <= 0) return null;
        const assetClass = i.assetClass === "stock" ? "stock" : "crypto";
        const costBasis = num(i.costBasis) ?? undefined;
        let meta: Record<string, unknown>;
        let title: string;
        if (assetClass === "crypto") {
          const q = symbolRaw.toLowerCase();
          const nameQ = str(i.name)?.toLowerCase();
          const coin = COIN_CATALOG.find(
            (c) =>
              c.symbol.toLowerCase() === q ||
              c.id === q ||
              (nameQ ? c.name.toLowerCase() === nameQ : false),
          );
          if (coin) {
            meta = {
              assetClass: "crypto",
              symbol: coin.symbol,
              coinId: coin.id,
              quantity,
              costBasis,
              currency: "USD",
            };
            title = coin.name;
          } else {
            // Unknown coin: still save it, guessing the id from the input.
            const sym = symbolRaw.toUpperCase();
            meta = {
              assetClass: "crypto",
              symbol: sym,
              coinId: q,
              quantity,
              costBasis,
              currency: "USD",
            };
            title = str(i.name) ?? sym;
          }
        } else {
          const sym = symbolRaw.toUpperCase();
          meta = {
            assetClass: "stock",
            symbol: sym,
            quantity,
            costBasis,
            currency: "USD",
          };
          title = str(i.name) ?? sym;
        }
        await captureItem({
          kind: "holding",
          title,
          status: "active",
          metadata: meta,
        });
        return {
          label: "Holding added",
          sub: `${fmtQty(quantity)} ${meta.symbol as string}`,
          href: "/finance",
        };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function friendlyDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return date;
  const ap = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  const time = m === 0 ? `${hh}${ap}` : `${hh}:${m.toString().padStart(2, "0")}${ap}`;
  return `${date} ${time}`;
}
