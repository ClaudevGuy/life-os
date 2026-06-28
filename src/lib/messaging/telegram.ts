"use client";

/**
 * Telegram channel — runs entirely in the browser via GramJS (MTProto over
 * WebSocket). NEVER import this module on the server: it (and `telegram`) touch
 * window/localStorage/Buffer at load. It's only ever pulled in through dynamic
 * import() in the browser (messaging-bootstrap + the Connections UI).
 *
 * The login flow is driven from a custom React UI (not GramJS's stdin prompt):
 *   tgStartLogin(apiId, apiHash, phone) -> code sent
 *   tgSubmitCode(code)                  -> { need2fa? }
 *   tgSubmitPassword(pw)                -> done (2FA accounts)
 */
import "./polyfill";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import bigInt from "big-integer";
import type { ChannelAdapter, MsgMessage, MsgThread } from "./types";
import { tgCreds } from "./credentials";
import { upsertAccount, upsertThreads, upsertMessages } from "@/lib/store/messaging";

const ACCOUNT_ID = "telegram";

function clientOpts() {
  return { connectionRetries: 5, useWSS: true } as const;
}

let client: TelegramClient | null = null;
let loginClient: TelegramClient | null = null;
let pendingPhone = "";
let pendingHash = "";

/** Lazily build + connect the live client from the stored session. */
async function getClient(): Promise<TelegramClient> {
  if (client) return client;
  const { apiId, apiHash, session } = await tgCreds.get();
  if (!apiId || !apiHash || !session) throw new Error("not_connected");
  const c = new TelegramClient(new StringSession(session), apiId, apiHash, clientOpts());
  await c.connect();
  client = c;
  return c;
}

function peerOf(threadId: string) {
  // `telegram:<id>` — reconstruct the BigInteger peer id GramJS resolves
  // against the session's entity cache (populated by getDialogs).
  const raw = threadId.split(":").slice(1).join(":");
  return bigInt(raw);
}

// ── login flow ──────────────────────────────────────────────────────────────

export async function tgStartLogin(
  apiId: number,
  apiHash: string,
  phone: string,
): Promise<void> {
  await tgCreds.setApi(apiId, apiHash);
  loginClient = new TelegramClient(new StringSession(""), apiId, apiHash, clientOpts());
  await loginClient.connect();
  const res = await loginClient.sendCode({ apiId, apiHash }, phone);
  pendingPhone = phone;
  pendingHash = res.phoneCodeHash;
}

export async function tgSubmitCode(code: string): Promise<{ need2fa: boolean }> {
  if (!loginClient) throw new Error("Start the login first");
  try {
    await loginClient.invoke(
      new Api.auth.SignIn({
        phoneNumber: pendingPhone,
        phoneCodeHash: pendingHash,
        phoneCode: code,
      }),
    );
  } catch (e) {
    const msg = (e as { errorMessage?: string }).errorMessage ?? "";
    if (msg === "SESSION_PASSWORD_NEEDED") return { need2fa: true };
    throw e;
  }
  await finishLogin();
  return { need2fa: false };
}

export async function tgSubmitPassword(password: string): Promise<void> {
  if (!loginClient) throw new Error("Start the login first");
  const { apiId, apiHash } = await tgCreds.get();
  if (!apiId || !apiHash) throw new Error("Missing API credentials");
  // 2.26.x has no client.checkPassword — drive the SRP password flow via
  // signInWithPassword with a one-shot password callback.
  await loginClient.signInWithPassword(
    { apiId, apiHash },
    {
      password: async () => password,
      onError: async () => true, // stop on a bad password instead of looping
    },
  );
  await finishLogin();
}

async function finishLogin(): Promise<void> {
  if (!loginClient) return;
  const session = String(loginClient.session.save() ?? "");
  await tgCreds.setSession(session);
  client = loginClient;
  loginClient = null;

  let label = "Telegram";
  try {
    const me = await client.getMe();
    const u = me as { phone?: string; username?: string; firstName?: string };
    label = u?.phone ? `+${u.phone}` : u?.username ? `@${u.username}` : u?.firstName ?? "Telegram";
  } catch {
    /* keep default label */
  }

  await upsertAccount({
    id: ACCOUNT_ID,
    channel: "telegram",
    label,
    status: "connected",
    addedAt: new Date(),
    updatedAt: new Date(),
  });
  await telegramAdapter.syncThreads(ACCOUNT_ID);
}

export async function tgDisconnect(): Promise<void> {
  try {
    await client?.disconnect();
  } catch {
    /* ignore */
  }
  client = null;
  loginClient = null;
}

// ── adapter ─────────────────────────────────────────────────────────────────

export const telegramAdapter: ChannelAdapter = {
  channel: "telegram",

  async syncThreads() {
    const c = await getClient();
    const dialogs = await c.getDialogs({ limit: 50 });
    const threads: MsgThread[] = [];
    for (const d of dialogs) {
      const id = d.id?.toString();
      if (!id) continue;
      const title = d.title || d.name || "Chat";
      threads.push({
        id: `${ACCOUNT_ID}:${id}`,
        accountId: ACCOUNT_ID,
        channel: "telegram",
        title,
        snippet: d.message?.message ?? "",
        unread: d.unreadCount ?? 0,
        lastTs: (d.date ?? 0) * 1000,
        avatarText: title.slice(0, 2).toUpperCase(),
        updatedAt: new Date(),
      });
    }
    await upsertThreads(threads);
  },

  async loadMessages(_accountId, threadId) {
    const c = await getClient();
    const peer = peerOf(threadId);
    const msgs = await c.getMessages(peer as unknown as Api.TypeInputPeer, { limit: 40 });
    const out: MsgMessage[] = [];
    for (const m of msgs) {
      const body = m.message ?? "";
      if (!body) continue;
      const fromMe = Boolean(m.out);
      let author = fromMe ? "You" : "Unknown";
      if (!fromMe) {
        try {
          const s = (await m.getSender()) as {
            firstName?: string;
            title?: string;
            username?: string;
          } | null;
          author = s?.firstName ?? s?.title ?? s?.username ?? "Unknown";
        } catch {
          /* keep Unknown */
        }
      }
      out.push({
        id: `${threadId}:${m.id}`,
        threadId,
        accountId: ACCOUNT_ID,
        channel: "telegram",
        fromMe,
        author,
        body,
        ts: (m.date ?? 0) * 1000,
      });
    }
    await upsertMessages(out);
  },

  async send(accountId, threadId, text) {
    const c = await getClient();
    const peer = peerOf(threadId);
    await c.sendMessage(peer as unknown as Api.TypeInputPeer, { message: text });
    await this.loadMessages(accountId, threadId);
  },

  async markRead(_accountId, threadId) {
    const c = await getClient();
    await c.markAsRead(peerOf(threadId) as unknown as Api.TypeInputPeer);
  },
};
