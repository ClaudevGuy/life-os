"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Cloud,
  CloudOff,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  getSyncToken,
  setSyncToken,
  getSyncGistId,
  getLastPushedAt,
  getLastPulledAt,
  getLastSyncError,
  disconnectSync,
  isSyncConfigured,
} from "@/lib/sync/state";
import { verifyToken, syncNow } from "@/lib/sync/gist";

type Status = "idle" | "connecting" | "syncing";

export function SyncSection() {
  const [draft, setDraft] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [gistId, setGistId] = useState<string | null>(null);
  const [lastPushed, setLastPushed] = useState<Date | null>(null);
  const [lastPulled, setLastPulled] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [login, setLogin] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [, setTick] = useState(0);

  function refreshFromState() {
    setToken(getSyncToken());
    setGistId(getSyncGistId());
    setLastPushed(getLastPushedAt());
    setLastPulled(getLastPulledAt());
    setLastError(getLastSyncError());
  }

  useEffect(() => {
    refreshFromState();
    // Re-render every 30s so the relative timestamps stay fresh.
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    // Also refresh when window regains focus — background syncs may have run.
    const onFocus = () => refreshFromState();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  async function connect() {
    const t = draft.trim();
    if (!t) {
      toast.error("Paste a GitHub token first");
      return;
    }
    setStatus("connecting");
    try {
      const check = await verifyToken(t);
      if (!check.ok) {
        toast.error(check.error ?? "Token rejected");
        return;
      }
      setSyncToken(t);
      setLogin(check.login ?? null);
      setDraft("");
      toast.success(`Connected as @${check.login}. Running first sync…`);
      const result = await syncNow();
      if (result.ok) {
        toast.success(
          `Synced · ${result.added ?? 0} new · ${result.updated ?? 0} updated`,
        );
      } else {
        toast.error(result.error ?? "Sync failed");
      }
      refreshFromState();
    } finally {
      setStatus("idle");
    }
  }

  async function doSyncNow() {
    setStatus("syncing");
    try {
      const result = await syncNow();
      if (result.ok) {
        toast.success(
          `Synced · +${result.added ?? 0} new · ${result.updated ?? 0} updated · ${result.deleted ?? 0} deleted`,
        );
      } else {
        toast.error(result.error ?? "Sync failed");
      }
      refreshFromState();
    } finally {
      setStatus("idle");
    }
  }

  function doDisconnect() {
    if (
      !confirm(
        "Disconnect this device from sync? Your local data stays untouched; future captures just won't push to the gist. The gist itself is not deleted.",
      )
    ) {
      return;
    }
    disconnectSync();
    setLogin(null);
    refreshFromState();
    toast.success("Disconnected");
  }

  const configured = isSyncConfigured() && !!token;
  const masked = token ? `${token.slice(0, 7)}…${token.slice(-4)}` : null;

  return (
    <div className="life-card divide-y divide-[var(--border-soft)] overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {configured ? (
            <Cloud size={14} className="text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <CloudOff size={14} className="text-[var(--text-faint)] mt-0.5 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Gist sync</span>
              {configured ? (
                <span className="text-[10px] text-emerald-400 uppercase tracking-wide">
                  ✓ Connected
                </span>
              ) : (
                <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-wide">
                  Not connected
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Mirror your IndexedDB to a private GitHub Gist so it follows you
              across devices. The gist is yours, version-tracked by GitHub,
              free. Photos stay local in v1.
            </p>
            <p className="mt-2 text-[11px] text-[var(--text-faint)]">
              Create a Personal Access Token at{" "}
              <a
                href="https://github.com/settings/tokens?type=beta&description=Life%20OS%20sync&scopes=gist"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                github.com/settings/tokens
              </a>{" "}
              with the <code className="font-mono text-[var(--accent)]">gist</code> scope.
            </p>
          </div>
        </div>

        {configured ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-2 py-1.5 flex-1">
                {reveal ? token : masked}
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
                onClick={doSyncNow}
                disabled={status !== "idle"}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition disabled:opacity-50"
              >
                {status === "syncing" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <RefreshCw size={11} />
                )}
                Sync now
              </button>
              <button
                type="button"
                onClick={doDisconnect}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition"
              >
                Disconnect
              </button>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[var(--text-faint)] flex-wrap">
              {gistId && (
                <a
                  href={`https://gist.github.com/${gistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--text-muted)]"
                  title="Open the underlying gist on GitHub"
                >
                  gist · {gistId.slice(0, 7)}
                </a>
              )}
              {lastPushed && (
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  pushed {formatRel(lastPushed)}
                </span>
              )}
              {lastPulled && (
                <span className="inline-flex items-center gap-1">
                  <RefreshCw size={10} />
                  pulled {formatRel(lastPulled)}
                </span>
              )}
              {lastError && (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <AlertCircle size={10} />
                  {lastError}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && connect()}
              placeholder="ghp_… or github_pat_…"
              className="flex-1 rounded-md bg-[var(--bg-rail)] border border-[var(--border-soft)] px-2.5 py-1.5 text-xs font-mono placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={connect}
              disabled={!draft.trim() || status !== "idle"}
              className="life-btn life-btn-sm life-btn-primary"
            >
              {status === "connecting" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={11} className="animate-spin" /> Connect
                </span>
              ) : (
                "Connect"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRel(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}
