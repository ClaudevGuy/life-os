"use client";

/**
 * Unified messaging store: live queries + helpers over the `msgAccounts`,
 * `msgThreads` and `msgMessages` Dexie tables, plus a small adapter registry so
 * each channel (Telegram, Gmail) can plug its sync/send logic in.
 *
 * These tables are deliberately NOT part of Gist sync or JSON backup — message
 * volume is high and credentials are sensitive, so messaging stays on-device.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { captureItem } from "./items";
import type {
  Channel,
  ChannelAdapter,
  MsgAccount,
  MsgMessage,
  MsgThread,
} from "@/lib/messaging/types";

// ── adapter registry ────────────────────────────────────────────────────────
// Channels call registerAdapter() once their connect flow is wired (phase 2+).

const adapters = new Map<Channel, ChannelAdapter>();

export function registerAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.channel, adapter);
}
export function getAdapter(channel: Channel): ChannelAdapter | undefined {
  return adapters.get(channel);
}

// ── accounts ────────────────────────────────────────────────────────────────

export function useMsgAccounts(): MsgAccount[] | undefined {
  return useLiveQuery(() => db.msgAccounts.toArray(), []);
}

export async function upsertAccount(account: MsgAccount): Promise<void> {
  await db.msgAccounts.put({ ...account, updatedAt: new Date() });
}

/** Remove an account and everything cached under it. Sequential (not a single
 *  transaction) to avoid dexie-react-hooks' multi-table live-query cache bug. */
export async function removeAccount(id: string): Promise<void> {
  await db.msgMessages.where("accountId").equals(id).delete();
  await db.msgThreads.where("accountId").equals(id).delete();
  await db.msgAccounts.delete(id);
}

// ── threads ─────────────────────────────────────────────────────────────────

export function useMsgThreads(
  filter: Channel | "all" = "all",
): MsgThread[] | undefined {
  return useLiveQuery(async () => {
    const rows =
      filter === "all"
        ? await db.msgThreads.toArray()
        : await db.msgThreads.where("channel").equals(filter).toArray();
    return rows.sort((a, b) => b.lastTs - a.lastTs);
  }, [filter]);
}

export async function upsertThreads(threads: MsgThread[]): Promise<void> {
  if (threads.length === 0) return;
  const now = new Date();
  await db.msgThreads.bulkPut(threads.map((t) => ({ ...t, updatedAt: now })));
}

export async function markThreadRead(threadId: string): Promise<void> {
  const t = await db.msgThreads.get(threadId);
  if (!t) return;
  await db.msgThreads.update(threadId, { unread: 0, updatedAt: new Date() });
  try {
    await getAdapter(t.channel)?.markRead?.(t.accountId, threadId);
  } catch {
    /* best-effort remote read */
  }
}

/** Count of threads with anything unread — for the sidebar badge. */
export function useMsgUnreadCount(): number | undefined {
  return useLiveQuery(async () => {
    const rows = await db.msgThreads.toArray();
    return rows.reduce((n, t) => n + (t.unread > 0 ? 1 : 0), 0);
  }, []);
}

// ── messages ────────────────────────────────────────────────────────────────

export function useMsgMessages(
  threadId: string | null,
): MsgMessage[] | undefined {
  return useLiveQuery(async () => {
    if (!threadId) return [];
    const rows = await db.msgMessages.where("threadId").equals(threadId).toArray();
    return rows.sort((a, b) => a.ts - b.ts);
  }, [threadId]);
}

export async function upsertMessages(messages: MsgMessage[]): Promise<void> {
  if (messages.length === 0) return;
  await db.msgMessages.bulkPut(messages);
}

// ── channel-routed actions ──────────────────────────────────────────────────

export async function sendMessage(threadId: string, text: string): Promise<void> {
  const t = await db.msgThreads.get(threadId);
  if (!t) throw new Error("Thread not found");
  const adapter = getAdapter(t.channel);
  if (!adapter) throw new Error("not_connected");
  await adapter.send(t.accountId, threadId, text);
}

export async function refreshThread(threadId: string): Promise<void> {
  const t = await db.msgThreads.get(threadId);
  if (!t) return;
  try {
    await getAdapter(t.channel)?.loadMessages(t.accountId, threadId);
  } catch {
    /* surfaced by the channel adapter */
  }
}

export async function refreshChannel(
  accountId: string,
  channel: Channel,
): Promise<void> {
  await getAdapter(channel)?.syncThreads(accountId);
}

// ── capture: message → task / note (reuses the normal item store) ────────────

export async function messageToTask(
  m: MsgMessage,
  thread?: MsgThread,
): Promise<void> {
  const who = thread?.title ?? m.author;
  await captureItem({
    kind: "task",
    title: who ? `Reply to ${who}` : "Reply to message",
    body: m.body,
    status: "active",
    capturedVia: "web",
    metadata: { source: "message", channel: m.channel, threadId: m.threadId },
  });
}

export async function messageToNote(
  m: MsgMessage,
  thread?: MsgThread,
): Promise<void> {
  const who = thread?.title ?? m.author;
  await captureItem({
    kind: "note",
    title: who ? `From ${who}` : "Saved message",
    body: m.body,
    status: "inbox",
    capturedVia: "web",
    metadata: { source: "message", channel: m.channel, threadId: m.threadId },
  });
}
