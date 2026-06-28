/**
 * Unified messaging — shared types for the Messages inbox. Pure types (no React,
 * no DOM) so the Dexie store in db.ts can import the row shapes directly.
 *
 * Each external service (Telegram, Gmail) is a "channel" with its own
 * adapter, added one phase at a time. The store and the inbox UI stay
 * channel-agnostic — they only ever talk to the rows below and the adapter
 * interface, never to a specific provider's SDK.
 */

export type Channel = "telegram" | "gmail";

export const CHANNELS: Channel[] = ["telegram", "gmail"];

export const CHANNEL_LABEL: Record<Channel, string> = {
  telegram: "Telegram",
  gmail: "Gmail",
};

export type AccountStatus = "connected" | "disconnected" | "error";

/**
 * A connected account for a channel. Display info only — access tokens /
 * session strings live under their own keys in `appKV` (never synced), so a
 * Gist sync or JSON export of the main tables can't leak credentials.
 */
export type MsgAccount = {
  id: string;
  channel: Channel;
  label: string; // email address, phone number, or @handle
  status: AccountStatus;
  error?: string;
  addedAt: Date;
  updatedAt: Date;
  meta?: Record<string, unknown>;
};

/** A conversation/thread shown in the unified inbox. */
export type MsgThread = {
  id: string; // `${accountId}:${threadKey}`
  accountId: string;
  channel: Channel;
  title: string; // contact name, chat title, or email subject
  snippet: string; // last-message preview
  unread: number;
  lastTs: number; // ms epoch of last activity — primary sort key
  avatarText?: string; // initials for the avatar
  link?: string; // optional deep link into the native app
  raw?: unknown; // channel-specific payload (peer ids, etc.)
  updatedAt: Date;
};

/** One message inside a thread. */
export type MsgMessage = {
  id: string; // `${threadId}:${externalId}`
  threadId: string;
  accountId: string;
  channel: Channel;
  fromMe: boolean;
  author: string;
  body: string;
  ts: number; // ms epoch
  raw?: unknown;
};

/**
 * What every channel implements (Telegram, Gmail). Adapters read/write the
 * Dexie store through the helpers in
 * store/messaging.ts and register themselves via `registerAdapter`.
 */
export interface ChannelAdapter {
  channel: Channel;
  /** Pull the latest threads for an account into the store. */
  syncThreads(accountId: string): Promise<void>;
  /** Pull (more) messages for one thread into the store. */
  loadMessages(accountId: string, threadId: string): Promise<void>;
  /** Send a reply / new message in a thread. */
  send(accountId: string, threadId: string, text: string): Promise<void>;
  /** Mark a thread read on the remote service (optional). */
  markRead?(accountId: string, threadId: string): Promise<void>;
}
