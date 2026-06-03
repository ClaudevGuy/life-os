"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import {
  getCreds,
  setCreds,
  type AiCreds,
  type AiProvider,
} from "@/lib/ai-key";

type Status = "idle" | "saving" | "testing" | "ok" | "bad";

type ProviderMeta = {
  label: string;
  placeholder: string;
  defaultModel: string;
  helpHref: string;
  helpHost: string;
  blurb: string;
};

const PROVIDERS: Record<AiProvider, ProviderMeta> = {
  anthropic: {
    label: "Anthropic",
    placeholder: "sk-ant-…",
    defaultModel: "claude-haiku-4-5",
    helpHref: "https://console.anthropic.com/settings/keys",
    helpHost: "console.anthropic.com",
    blurb: "Direct Claude access. Cheap, fast, good at long documents.",
  },
  openai: {
    label: "OpenAI",
    placeholder: "sk-proj-…",
    defaultModel: "gpt-4o-mini",
    helpHref: "https://platform.openai.com/api-keys",
    helpHost: "platform.openai.com",
    blurb: "Direct OpenAI access. Great general-purpose.",
  },
};

const ORDER: AiProvider[] = ["anthropic", "openai"];

export function AiKeySection() {
  const [saved, setSaved] = useState<AiCreds | null>(null);
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [keyDraft, setKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const c = getCreds();
    setSaved(c);
    if (c) {
      setProvider(c.provider);
      setModelDraft(c.model ?? "");
    }
  }, []);

  const meta = PROVIDERS[provider];
  const editing = !saved || saved.provider !== provider;

  function save() {
    const key = keyDraft.trim();
    if (!key) {
      toast.error("Paste a key first");
      return;
    }
    setStatus("saving");
    const next: AiCreds = {
      provider,
      key,
      ...(modelDraft.trim() ? { model: modelDraft.trim() } : {}),
    };
    setCreds(next);
    setSaved(next);
    setKeyDraft("");
    setStatus("idle");
    toast.success("AI credentials saved locally");
  }

  function updateModel(next: string) {
    setModelDraft(next);
    // Live-save the model override when there's an existing credential.
    if (saved && !editing) {
      const merged: AiCreds = {
        provider: saved.provider,
        key: saved.key,
        ...(next.trim() ? { model: next.trim() } : {}),
      };
      setCreds(merged);
      setSaved(merged);
    }
  }

  function clear() {
    if (
      !confirm(
        "Forget this AI key? Brief and Ask will stop working until you paste another one (or set AI_GATEWAY_API_KEY on the server).",
      )
    )
      return;
    setCreds(null);
    setSaved(null);
    setKeyDraft("");
    setModelDraft("");
    setStatus("idle");
    toast.success("Cleared");
  }

  async function test() {
    setStatus("testing");
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (saved) {
      headers.Authorization = `Bearer ${saved.key}`;
      headers["x-ai-provider"] = saved.provider;
      if (saved.model) headers["x-ai-model"] = saved.model;
    }
    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers,
        body: JSON.stringify({
          recent: [
            {
              kind: "note",
              title: "test",
              summary: "Reply with a single word: working",
            },
          ],
        }),
      });
      if (!res.ok) {
        setStatus("bad");
        const data = (await res.json().catch(() => null)) as {
          detail?: string;
        } | null;
        toast.error(data?.detail ?? "AI call failed");
        return;
      }
      setStatus("ok");
      toast.success("AI is reachable");
    } catch {
      setStatus("bad");
      toast.error("Couldn't reach the AI proxy");
    }
  }

  const masked = saved
    ? `${saved.key.slice(0, 6)}…${saved.key.slice(-4)}`
    : null;

  return (
    <div className="life-card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div
          className="grid place-items-center w-9 h-9 rounded-[9px] shrink-0"
          style={{
            background: "var(--terra-tint)",
            color: "var(--terra)",
          }}
        >
          <Key size={15} strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--ink)]">
            AI credentials
          </div>
          <p className="text-[12.5px] text-[var(--muted)] mt-0.5 leading-relaxed">
            Required for the Brief on{" "}
            <code className="font-mono text-[var(--terra)]">/today</code> and
            the chat on{" "}
            <code className="font-mono text-[var(--terra)]">/ask</code>. Stored
            in this browser only.
          </p>
        </div>
      </div>

      {/* Provider picker */}
      <label className="block text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        Provider
      </label>
      <div className="inline-flex items-center gap-1 p-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] mb-3">
        {ORDER.map((p) => {
          const active = provider === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setProvider(p);
                if (saved?.provider !== p) {
                  setKeyDraft("");
                  setModelDraft("");
                }
              }}
              className={`px-3 py-1.5 rounded-[7px] text-[12.5px] font-medium transition ${
                active
                  ? "bg-[var(--paper)] text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              style={active ? { boxShadow: "var(--shadow-1)" } : undefined}
            >
              {PROVIDERS[p].label}
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-[var(--muted)] mb-4 leading-relaxed">
        {meta.blurb}{" "}
        <a
          href={meta.helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--terra)] hover:underline"
        >
          Get one at {meta.helpHost} →
        </a>
      </p>

      {/* Key field — either reveal-existing or paste-new */}
      <label className="block text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        API key
      </label>
      {saved && !editing ? (
        <div className="flex items-center gap-2 mb-3">
          <code className="font-mono text-[12px] text-[var(--muted)] bg-[var(--paper-2)] border border-[var(--line)] rounded-[10px] px-3 py-2 flex-1">
            {reveal ? saved.key : masked}
          </code>
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="grid place-items-center w-9 h-9 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            aria-label={reveal ? "Hide" : "Reveal"}
          >
            {reveal ? (
              <EyeOff size={14} strokeWidth={1.6} />
            ) : (
              <Eye size={14} strokeWidth={1.6} />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder={meta.placeholder}
            className="flex-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      {/* Model override */}
      <label className="block text-[10.5px] uppercase tracking-[0.14em] font-semibold text-[var(--muted)] mb-2">
        Model{" "}
        <span className="opacity-60 normal-case tracking-normal font-normal">
          (optional)
        </span>
      </label>
      <input
        type="text"
        value={modelDraft}
        onChange={(e) => updateModel(e.target.value)}
        placeholder={meta.defaultModel}
        className="w-full rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        autoComplete="off"
        spellCheck={false}
      />
      <p className="mt-1.5 text-[11px] text-[var(--muted-2)]">
        Leave empty to use the default ({meta.defaultModel}).
      </p>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-2">
        {saved ? (
          <>
            <button
              type="button"
              onClick={test}
              disabled={status === "testing"}
              className="life-btn life-btn-sm life-btn-secondary"
            >
              {status === "testing" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : status === "ok" ? (
                <Check size={12} className="text-[var(--sage)]" />
              ) : status === "bad" ? (
                <X size={12} className="text-[var(--bad)]" />
              ) : (
                <Sparkles size={12} strokeWidth={1.6} />
              )}
              Test
            </button>
            <button
              type="button"
              onClick={clear}
              className="life-btn life-btn-sm life-btn-ghost"
            >
              Clear
            </button>
            <div className="ml-auto">
              {editing ? (
                <button
                  type="button"
                  onClick={save}
                  disabled={!keyDraft.trim() || status === "saving"}
                  className="life-btn life-btn-sm life-btn-primary"
                >
                  Save as {meta.label}
                </button>
              ) : (
                <span className="text-[11.5px] text-[var(--muted)]">
                  Stored as {PROVIDERS[saved.provider].label}
                </span>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={!keyDraft.trim() || status === "saving"}
            className="life-btn life-btn-sm life-btn-primary ml-auto"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
