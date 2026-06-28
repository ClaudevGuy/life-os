"use client";

/**
 * Gmail channel — browser-only via Google Identity Services (GIS) token model
 * + the Gmail REST API (CORS-enabled). No backend, no client secret. Access
 * tokens last ~1h with no refresh token client-side, so we silently
 * re-acquire (consent persists per user+client). One scope — gmail.modify —
 * covers read, reply and mark-read.
 */
import type { ChannelAdapter, MsgMessage, MsgThread } from "./types";
import { gmailCreds } from "./credentials";
import { upsertAccount, upsertThreads, upsertMessages } from "@/lib/store/messaging";

const ACCOUNT_ID = "gmail";
const SCOPE = "https://www.googleapis.com/auth/gmail.modify";
const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/* eslint-disable @typescript-eslint/no-explicit-any */
type GisTokenClient = {
  callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

let accessToken: string | null = null;
let expiresAt = 0;
let tokenClient: GisTokenClient | null = null;

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.google?.accounts?.oauth2) return resolve();
    const existing = document.getElementById("gis-client-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.id = "gis-client-script";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google script failed to load"));
    document.head.appendChild(s);
  });
}

async function ensureTokenClient(): Promise<GisTokenClient> {
  const clientId = await gmailCreds.getClientId();
  if (!clientId) throw new Error("not_connected");
  await loadGis();
  if (!tokenClient) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: () => {},
    }) as GisTokenClient;
  }
  return tokenClient;
}

function requestToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureTokenClient()
      .then((tc) => {
        tc.callback = (resp) => {
          if (resp.error || !resp.access_token) return reject(new Error(resp.error || "no_token"));
          accessToken = resp.access_token;
          expiresAt = Date.now() + (resp.expires_in ?? 3600) * 1000;
          resolve(accessToken);
        };
        tc.requestAccessToken({ prompt: interactive ? "consent" : "" });
      })
      .catch(reject);
  });
}

async function getToken(): Promise<string> {
  if (accessToken && Date.now() < expiresAt - 60_000) return accessToken;
  return requestToken(false);
}

async function api(path: string, init: RequestInit = {}): Promise<any> {
  const run = (token: string) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  let res = await run(await getToken());
  if (res.status === 401) res = await run(await requestToken(false));
  if (!res.ok) throw new Error(`Gmail ${res.status}`);
  return res.json();
}

function header(payload: any, name: string): string {
  const h = (payload?.headers ?? []).find(
    (x: any) => x.name?.toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? "";
}
function nameFromAddr(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
  return (m?.[1] ?? from).trim() || from;
}
function decodeB64Url(data: string): string {
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}
function findPart(payload: any, mime: string): string | null {
  if (!payload) return null;
  if (payload.mimeType === mime && payload.body?.data) return payload.body.data;
  for (const p of payload.parts ?? []) {
    const f = findPart(p, mime);
    if (f) return f;
  }
  return null;
}
function bodyOf(payload: any, snippet: string): string {
  const plain = findPart(payload, "text/plain");
  if (plain) return decodeB64Url(plain).trim();
  const html = findPart(payload, "text/html");
  if (html)
    return decodeB64Url(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return snippet ?? "";
}
function toBase64Url(str: string): string {
  const utf8 = new TextEncoder().encode(str);
  let bin = "";
  utf8.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function gmailConnect(clientId: string): Promise<void> {
  await gmailCreds.setClientId(clientId.trim());
  tokenClient = null;
  accessToken = null;
  await requestToken(true); // interactive — needs a user click
  const profile = await api("/profile");
  await upsertAccount({
    id: ACCOUNT_ID,
    channel: "gmail",
    label: profile.emailAddress ?? "Gmail",
    status: "connected",
    addedAt: new Date(),
    updatedAt: new Date(),
  });
  await gmailAdapter.syncThreads(ACCOUNT_ID);
}

export async function gmailDisconnect(): Promise<void> {
  accessToken = null;
  expiresAt = 0;
  tokenClient = null;
}

export const gmailAdapter: ChannelAdapter = {
  channel: "gmail",

  async syncThreads() {
    const list = await api("/threads?maxResults=25&labelIds=INBOX");
    const threads: MsgThread[] = [];
    for (const t of list.threads ?? []) {
      const full = await api(
        `/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      );
      const msgs = full.messages ?? [];
      const last = msgs[msgs.length - 1];
      const from = nameFromAddr(header(last?.payload, "From"));
      threads.push({
        id: `${ACCOUNT_ID}:${t.id}`,
        accountId: ACCOUNT_ID,
        channel: "gmail",
        title: header(last?.payload, "Subject") || "(no subject)",
        snippet: `${from}: ${t.snippet ?? ""}`,
        unread: msgs.some((m: any) => (m.labelIds ?? []).includes("UNREAD")) ? 1 : 0,
        lastTs: Number(last?.internalDate ?? 0),
        avatarText: from.slice(0, 2).toUpperCase(),
        updatedAt: new Date(),
      });
    }
    await upsertThreads(threads);
  },

  async loadMessages(_accountId, threadId) {
    const id = threadId.split(":").slice(1).join(":");
    const full = await api(`/threads/${id}?format=full`);
    const out: MsgMessage[] = (full.messages ?? []).map((m: any) => {
      const fromMe = (m.labelIds ?? []).includes("SENT");
      return {
        id: `${threadId}:${m.id}`,
        threadId,
        accountId: ACCOUNT_ID,
        channel: "gmail" as const,
        fromMe,
        author: fromMe ? "You" : nameFromAddr(header(m.payload, "From")),
        body: bodyOf(m.payload, m.snippet),
        ts: Number(m.internalDate ?? 0),
      };
    });
    await upsertMessages(out);
  },

  async send(accountId, threadId, text) {
    const id = threadId.split(":").slice(1).join(":");
    const meta = await api(
      `/threads/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=References`,
    );
    const msgs = meta.messages ?? [];
    const last = msgs[msgs.length - 1];
    const to = header(last?.payload, "From");
    const subject = header(last?.payload, "Subject");
    const msgId = header(last?.payload, "Message-ID");
    const refs = header(last?.payload, "References");
    const profile = await api("/profile");

    const subjectLine = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
    const headers = [
      `From: ${profile.emailAddress}`,
      `To: ${to}`,
      `Subject: ${subjectLine}`,
    ];
    if (msgId) headers.push(`In-Reply-To: ${msgId}`);
    if (msgId) headers.push(`References: ${refs ? `${refs} ${msgId}` : msgId}`);
    headers.push(`Content-Type: text/plain; charset="UTF-8"`, `MIME-Version: 1.0`);
    const raw = toBase64Url(`${headers.join("\r\n")}\r\n\r\n${text}`);

    await api("/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw, threadId: id }),
    });
    await this.loadMessages(accountId, threadId);
  },

  async markRead(_accountId, threadId) {
    const id = threadId.split(":").slice(1).join(":");
    await api(`/threads/${id}/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
    });
  },
};
