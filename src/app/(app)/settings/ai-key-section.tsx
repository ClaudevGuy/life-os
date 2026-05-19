"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Key, Eye, EyeOff, Check, Loader2, X } from "lucide-react";
import { getAiKey, setAiKey } from "@/lib/ai-key";

type Status = "idle" | "saving" | "testing" | "ok" | "bad";

export function AiKeySection() {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    setSaved(getAiKey());
  }, []);

  function save() {
    const next = draft.trim();
    if (!next) {
      toast.error("Paste a key first");
      return;
    }
    setStatus("saving");
    setAiKey(next);
    setSaved(next);
    setDraft("");
    setStatus("idle");
    toast.success("AI key saved locally");
  }

  function clear() {
    if (!confirm("Forget this AI key? Brief and Ask will stop working until you paste another one (or set AI_GATEWAY_API_KEY on the server).")) {
      return;
    }
    setAiKey(null);
    setSaved(null);
    setStatus("idle");
    toast.success("Cleared");
  }

  async function test() {
    setStatus("testing");
    try {
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(saved ? { Authorization: `Bearer ${saved}` } : {}),
        },
        body: JSON.stringify({
          recent: [
            {
              kind: "note",
              title: "test",
              summary: "Replying with a single word: working",
            },
          ],
        }),
      });
      if (!res.ok) {
        setStatus("bad");
        const data = (await res.json().catch(() => null)) as { detail?: string } | null;
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
    ? `${saved.slice(0, 6)}…${saved.slice(-4)}`
    : null;

  return (
    <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <Key size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Anthropic API key</div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Required for the Brief on{" "}
              <code className="font-mono text-[var(--accent)]">/today</code> and
              the chat on{" "}
              <code className="font-mono text-[var(--accent)]">/ask</code>. Get
              one at{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                console.anthropic.com
              </a>
              . The key is stored in this browser only and sent as a Bearer
              header on AI requests.
            </p>
          </div>
        </div>

        {saved ? (
          <div className="mt-4 flex items-center gap-2">
            <code className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-2 py-1.5 flex-1">
              {reveal ? saved : masked}
            </code>
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="grid place-items-center w-7 h-7 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card-hover)] transition"
              aria-label={reveal ? "Hide" : "Reveal"}
            >
              {reveal ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button
              type="button"
              onClick={test}
              disabled={status === "testing"}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition disabled:opacity-50"
            >
              {status === "testing" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : status === "ok" ? (
                <Check size={11} className="text-emerald-400" />
              ) : status === "bad" ? (
                <X size={11} className="text-red-400" />
              ) : null}
              Test
            </button>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="sk-ant-…"
              className="flex-1 rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-2.5 py-1.5 text-xs font-mono placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={save}
              disabled={!draft.trim() || status === "saving"}
              className="rounded-md bg-[var(--accent)] text-zinc-950 px-3 py-1.5 text-xs font-medium hover:brightness-110 transition disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
