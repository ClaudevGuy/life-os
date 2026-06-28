"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Mail, RefreshCw, Check, Loader2, HelpCircle, ExternalLink } from "lucide-react";
import { useMsgAccounts, removeAccount, refreshChannel } from "@/lib/store/messaging";
import type { Channel } from "@/lib/messaging/types";
import { tgCreds, gmailCreds } from "@/lib/messaging/credentials";
import { BrandLogo } from "@/components/brand-icons";

export function ConnectionsSection() {
  const accounts = useMsgAccounts();
  const statusOf = (c: Channel) => accounts?.find((a) => a.id === c);

  return (
    <div className="space-y-3">
      <TelegramCard account={statusOf("telegram")} />
      <GmailCard account={statusOf("gmail")} />
      <p className="text-[11.5px] text-[var(--muted-2)] leading-relaxed px-1">
        Everything runs in this browser — no server. Credentials and sessions are
        stored only on this device (never synced or exported). See the setup
        guide for how to get each one.
      </p>
    </div>
  );
}

// ── shared shell ──────────────────────────────────────────────────────────────

function Help({
  steps,
  link,
  note,
}: {
  steps: React.ReactNode[];
  link?: { href: string; label: string };
  note?: string;
}) {
  return (
    <>
      <ol className="list-decimal pl-4 space-y-1">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[var(--terra)] hover:underline"
        >
          {link.label}
          <ExternalLink size={11} />
        </a>
      )}
      {note && <p className="mt-2 text-[11px] text-[var(--muted-2)]">{note}</p>}
    </>
  );
}

const CHANNEL_HELP: Record<Channel, React.ReactNode> = {
  telegram: (
    <Help
      steps={[
        "Open my.telegram.org and log in with your phone number.",
        'Click "API development tools".',
        'Create an app — any title; platform "Web".',
        "Copy the api_id (a number) and api_hash (long string) into the fields here.",
      ]}
      link={{ href: "https://my.telegram.org", label: "Open my.telegram.org" }}
      note="Telegram allows third-party clients, so there's no ban risk. You'll do a one-time phone-code login."
    />
  ),
  gmail: (
    <Help
      steps={[
        "At console.cloud.google.com, create a project.",
        'APIs & Services → Library → enable the "Gmail API".',
        "OAuth consent screen → External → add your own Gmail as a Test user (leave it in Testing).",
        'Credentials → Create credentials → OAuth client ID → type "Web application".',
        "Under Authorized JavaScript origins, add http://localhost:3000.",
        "Copy the Client ID (ends in .apps.googleusercontent.com) into the field here.",
      ]}
      link={{
        href: "https://console.cloud.google.com",
        label: "Open Google Cloud Console",
      }}
      note={'On first connect you may see "Google hasn’t verified this app" — click Advanced → Go to Life OS → Allow. That is expected for your own app.'}
    />
  ),
};

function Card({
  channel,
  name,
  label,
  children,
}: {
  channel: Channel;
  name: string;
  label?: string;
  children: React.ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="life-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="grid place-items-center w-6 h-6 rounded-[7px] bg-white shrink-0" style={{ boxShadow: "var(--shadow-1)" }}>
          <BrandLogo channel={channel} size={16} />
        </span>
        <div className="font-medium text-[14px] text-[var(--ink)]">{name}</div>
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-label={`How to get ${name} credentials`}
          aria-expanded={showHelp}
          title="How to get these"
          className={`grid place-items-center w-[18px] h-[18px] rounded-full border transition shrink-0 ${
            showHelp
              ? "border-[var(--terra)] text-[var(--terra)]"
              : "border-[var(--line-2)] text-[var(--muted)] hover:text-[var(--terra)] hover:border-[var(--terra)]"
          }`}
        >
          <HelpCircle size={12} />
        </button>
        {label && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[var(--ok)] font-medium">
            <Check size={12} /> {label}
          </span>
        )}
      </div>
      {showHelp && (
        <div className="mb-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] p-3 text-[12px] text-[var(--muted)] leading-relaxed">
          {CHANNEL_HELP[channel]}
        </div>
      )}
      {children}
    </div>
  );
}

function ConnectedRow({ channel }: { channel: Channel }) {
  const [busy, setBusy] = useState<null | "sync" | "off">(null);

  async function sync() {
    setBusy("sync");
    try {
      await refreshChannel(channel, channel);
      toast.success("Synced");
    } catch {
      toast.error("Couldn't sync — try reconnecting");
    } finally {
      setBusy(null);
    }
  }
  async function disconnect() {
    setBusy("off");
    try {
      await removeAccount(channel);
      if (channel === "telegram") {
        const m = await import("@/lib/messaging/telegram");
        await m.tgDisconnect();
        await tgCreds.clear();
      } else {
        const m = await import("@/lib/messaging/gmail");
        await m.gmailDisconnect();
        await gmailCreds.clear();
      }
      toast.success("Disconnected");
    } catch {
      toast.error("Couldn't fully disconnect");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={sync}
        disabled={busy !== null}
        className="life-btn life-btn-sm life-btn-secondary"
      >
        {busy === "sync" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        Sync now
      </button>
      <button
        type="button"
        onClick={disconnect}
        disabled={busy !== null}
        className="life-btn life-btn-sm life-btn-ghost text-[var(--bad)]"
      >
        Disconnect
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-[9px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition";

// ── Telegram ──────────────────────────────────────────────────────────────────

function TelegramCard({ account }: { account?: { label: string } }) {
  const [step, setStep] = useState<"creds" | "code" | "2fa">("creds");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (account) {
    return (
      <Card channel="telegram" name="Telegram" label={account.label}>
        <ConnectedRow channel="telegram" />
      </Card>
    );
  }

  async function sendCode() {
    if (!apiId || !apiHash || !phone) return toast.error("Fill in all three fields");
    setBusy(true);
    try {
      const m = await import("@/lib/messaging/telegram");
      await m.tgStartLogin(Number(apiId), apiHash.trim(), phone.trim());
      setStep("code");
      toast.success("Code sent to your Telegram");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start login");
    } finally {
      setBusy(false);
    }
  }
  async function submitCode() {
    setBusy(true);
    try {
      const m = await import("@/lib/messaging/telegram");
      const { need2fa } = await m.tgSubmitCode(code.trim());
      if (need2fa) {
        setStep("2fa");
        toast("Enter your 2FA password");
      } else {
        toast.success("Telegram connected");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wrong or expired code");
    } finally {
      setBusy(false);
    }
  }
  async function submitPw() {
    setBusy(true);
    try {
      const m = await import("@/lib/messaging/telegram");
      await m.tgSubmitPassword(pw);
      toast.success("Telegram connected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wrong password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card channel="telegram" name="Telegram">
      {step === "creds" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="api_id"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
              inputMode="numeric"
            />
            <input
              className={inputCls}
              placeholder="api_hash"
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
            />
          </div>
          <input
            className={inputCls}
            placeholder="Phone (e.g. +15551234567)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button type="button" onClick={sendCode} disabled={busy} className="life-btn life-btn-sm life-btn-primary">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Send code
          </button>
        </div>
      )}
      {step === "code" && (
        <div className="space-y-2">
          <input
            className={inputCls}
            placeholder="Login code from Telegram"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
          />
          <button type="button" onClick={submitCode} disabled={busy} className="life-btn life-btn-sm life-btn-primary">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Verify
          </button>
        </div>
      )}
      {step === "2fa" && (
        <div className="space-y-2">
          <input
            className={inputCls}
            type="password"
            placeholder="2FA password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button type="button" onClick={submitPw} disabled={busy} className="life-btn life-btn-sm life-btn-primary">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Sign in
          </button>
        </div>
      )}
    </Card>
  );
}

// ── Gmail ─────────────────────────────────────────────────────────────────────

function GmailCard({ account }: { account?: { label: string } }) {
  const [clientId, setClientId] = useState("");
  const [busy, setBusy] = useState(false);

  if (account) {
    return (
      <Card channel="gmail" name="Gmail" label={account.label}>
        <ConnectedRow channel="gmail" />
      </Card>
    );
  }

  async function connect() {
    if (!clientId.trim()) return toast.error("Paste your Google OAuth client ID");
    setBusy(true);
    try {
      const m = await import("@/lib/messaging/gmail");
      await m.gmailConnect(clientId);
      toast.success("Gmail connected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card channel="gmail" name="Gmail">
      <div className="space-y-2">
        <input
          className={inputCls}
          placeholder="Google OAuth client ID (…apps.googleusercontent.com)"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        />
        <button type="button" onClick={connect} disabled={busy} className="life-btn life-btn-sm life-btn-primary">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
          Connect Google
        </button>
      </div>
    </Card>
  );
}


