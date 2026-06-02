"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Music,
  Search,
  X,
  ListMusic,
  Play,
  Loader2,
  LogOut,
  ExternalLink,
  AudioLines,
} from "lucide-react";
import { useMusic } from "@/components/music-player";
import type { Playlist, Track } from "@/lib/youtube-types";

type Status = { configured: boolean; connected: boolean; name: string | null };

export default function MusicPage() {
  return (
    <Suspense fallback={null}>
      <MusicInner />
    </Suspense>
  );
}

function MusicInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/youtube/status");
      setStatus(await res.json());
    } catch {
      setStatus({ configured: false, connected: false, name: null });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Surface OAuth errors handed back via ?error=
  useEffect(() => {
    const err = params.get("error");
    if (!err) return;
    const msg: Record<string, string> = {
      unconfigured: "Add your Google credentials first (see setup below).",
      no_code: "Authorization was cancelled.",
      no_refresh: "Google didn't return a refresh token — try again.",
      exchange_failed: "Couldn't complete sign-in. Check your credentials.",
      access_denied: "Access was denied.",
    };
    toast.error(msg[err] ?? `Sign-in error: ${err}`);
  }, [params]);

  if (!status) {
    return (
      <div className="p-8 max-w-6xl mx-auto pg-enter">
        <Header />
        <div className="mt-10 flex items-center justify-center text-[var(--muted)]">
          <Loader2 size={18} className="animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto pg-enter">
      <Header name={status.connected ? status.name : null} />
      {!status.configured ? (
        <SetupGuide />
      ) : !status.connected ? (
        <ConnectScreen />
      ) : (
        <Connected onDisconnected={loadStatus} />
      )}
    </div>
  );
}

function Header({ name }: { name?: string | null }) {
  return (
    <header className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
      <div>
        <h1 className="life-h1 inline-flex items-center gap-2">
          <Music size={20} strokeWidth={1.6} className="text-[var(--terra)]" />
          Music
        </h1>
        <p className="text-[14.5px] text-[var(--muted)] mt-1">
          Your YouTube Music, playing inside Life OS.
        </p>
      </div>
      {name && (
        <span className="text-[12px] text-[var(--muted)]">
          Connected as{" "}
          <span className="font-medium text-[var(--ink)]">{name}</span>
        </span>
      )}
    </header>
  );
}

// ── Connected: search + playlists + tracks ────────────────────────────────

function Connected({ onDisconnected }: { onDisconnected: () => void }) {
  const music = useMusic();
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/youtube/playlists");
        const data = await res.json();
        if (data.error) {
          if (res.status === 401) onDisconnected();
          setPlaylists([]);
          return;
        }
        setPlaylists(data.playlists);
      } catch {
        setPlaylists([]);
      }
    })();
  }, [onDisconnected]);

  const openPlaylist = useCallback(async (pl: Playlist) => {
    setSelected(pl);
    setTracks(null);
    setLoadingTracks(true);
    try {
      const res = await fetch(
        `/api/youtube/items?playlistId=${encodeURIComponent(pl.id)}`,
      );
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {
      setTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  }, []);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.tracks ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults(null);
  }

  async function disconnect() {
    if (!confirm("Disconnect your YouTube Music account?")) return;
    try {
      await fetch("/api/youtube/disconnect", { method: "POST" });
      music.close();
      toast.success("Disconnected");
      onDisconnected();
    } catch {
      toast.error("Couldn't disconnect");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <form
          onSubmit={runSearch}
          className="flex-1 flex items-center gap-2 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] focus-within:border-[var(--terra)] px-3 h-10 transition"
        >
          <Search
            size={15}
            strokeWidth={1.6}
            className="text-[var(--muted)] shrink-0"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube Music…"
            className="flex-1 bg-transparent text-[14px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
          />
          {(query || results) && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear"
              className="grid place-items-center w-5 h-5 rounded-[5px] text-[var(--muted)] hover:text-[var(--ink)] transition shrink-0"
            >
              <X size={13} strokeWidth={1.8} />
            </button>
          )}
        </form>
        <button
          type="button"
          onClick={disconnect}
          className="life-btn life-btn-sm life-btn-ghost shrink-0"
        >
          <LogOut size={13} strokeWidth={1.6} />
          Disconnect
        </button>
      </div>

      {results !== null ? (
        <section>
          <SectionLabel
            icon={<Search size={14} strokeWidth={1.7} />}
            label={searching ? "Searching…" : `Results for “${query}”`}
            count={results.length}
          />
          <TrackList tracks={results} loading={searching} />
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
          {/* Playlists */}
          <aside className="md:sticky md:top-8 space-y-1">
            <SectionLabel
              icon={<ListMusic size={14} strokeWidth={1.7} />}
              label="Playlists"
              count={playlists?.length}
            />
            {playlists === null ? (
              <RowSkeleton />
            ) : playlists.length === 0 ? (
              <p className="text-[12.5px] text-[var(--muted)] px-2 py-3">
                No playlists found.
              </p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {playlists.map((pl) => (
                  <PlaylistRow
                    key={pl.id}
                    playlist={pl}
                    active={selected?.id === pl.id}
                    onClick={() => openPlaylist(pl)}
                  />
                ))}
              </div>
            )}
          </aside>

          {/* Tracks */}
          <section className="min-w-0">
            {selected ? (
              <>
                <SectionLabel
                  icon={<AudioLines size={14} strokeWidth={1.7} />}
                  label={selected.title}
                  count={tracks?.length}
                />
                <TrackList tracks={tracks ?? []} loading={loadingTracks} />
              </>
            ) : (
              <div className="rounded-[12px] border border-dashed border-[var(--line-2)] py-16 px-6 text-center">
                <div
                  className="mx-auto mb-4 grid place-items-center w-[54px] h-[54px] rounded-full bg-[var(--paper)] text-[var(--terra)]"
                  style={{ boxShadow: "var(--shadow-1)" }}
                >
                  <ListMusic size={22} strokeWidth={1.6} />
                </div>
                <div className="text-[15px] font-medium text-[var(--ink)]">
                  Pick a playlist
                </div>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Choose one on the left, or search above to play anything.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function PlaylistRow({
  playlist: pl,
  active,
  onClick,
}: {
  playlist: Playlist;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2.5 w-full px-2 py-1.5 rounded-[9px] text-left transition ${
        active
          ? "bg-[var(--paper-2)]"
          : "hover:bg-[var(--bg-2)]"
      }`}
    >
      <div className="grid place-items-center w-9 h-9 rounded-[7px] overflow-hidden shrink-0 bg-[var(--terra-tint)] text-[var(--terra)]">
        {pl.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pl.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <ListMusic size={16} strokeWidth={1.7} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[13.5px] truncate ${
            active
              ? "text-[var(--ink)] font-medium"
              : "text-[var(--ink-2)]"
          }`}
        >
          {pl.title}
        </div>
        {pl.count != null && (
          <div className="text-[11px] text-[var(--muted-2)] font-mono tabular-nums">
            {pl.count} track{pl.count === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </button>
  );
}

function TrackList({
  tracks,
  loading,
}: {
  tracks: Track[];
  loading: boolean;
}) {
  const music = useMusic();

  if (loading) return <RowSkeleton rows={6} />;
  if (tracks.length === 0) {
    return (
      <p className="text-[13px] text-[var(--muted)] px-2 py-6">
        Nothing here.
      </p>
    );
  }

  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper)] overflow-hidden" style={{ boxShadow: "var(--shadow-1)" }}>
      {tracks.map((t, i) => {
        const playing = music.current?.videoId === t.videoId;
        return (
          <button
            key={`${t.videoId}-${i}`}
            type="button"
            onClick={() => music.playQueue(tracks, i)}
            className={`group flex items-center gap-3 w-full px-3 py-2.5 text-left transition ${
              i > 0 ? "border-t border-[var(--line)]" : ""
            } ${playing ? "bg-[var(--terra-tint)]" : "hover:bg-[var(--paper-2)]"}`}
          >
            <div className="relative w-10 h-10 rounded-[7px] overflow-hidden shrink-0 bg-[var(--bg-2)]">
              {t.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
              <span
                className={`absolute inset-0 grid place-items-center bg-black/35 text-white transition ${
                  playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {playing ? (
                  <AudioLines size={15} strokeWidth={2} />
                ) : (
                  <Play size={15} strokeWidth={2} fill="currentColor" />
                )}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={`text-[13.5px] truncate ${
                  playing
                    ? "text-[var(--terra)] font-semibold"
                    : "text-[var(--ink)]"
                }`}
              >
                {t.title}
              </div>
              <div className="text-[11.5px] text-[var(--muted)] truncate mt-0.5">
                {t.channel}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SectionLabel({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number | null;
}) {
  return (
    <div className="flex items-center gap-2 mb-2.5 px-0.5">
      <span className="text-[var(--muted)]">{icon}</span>
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ink)] truncate">
        {label}
      </span>
      {count != null && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full bg-[var(--bg-2)] text-[10.5px] font-mono font-semibold text-[var(--muted)] tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-11 rounded-[9px] bg-[var(--bg-2)] animate-pulse"
        />
      ))}
    </div>
  );
}

// ── Not connected ─────────────────────────────────────────────────────────

function ConnectScreen() {
  return (
    <div className="rounded-[14px] border border-[var(--line-2)] bg-[var(--paper)] p-8 text-center max-w-xl mx-auto" style={{ boxShadow: "var(--shadow-1)" }}>
      <div
        className="mx-auto mb-4 grid place-items-center w-[60px] h-[60px] rounded-full bg-[var(--terra-tint)] text-[var(--terra)]"
      >
        <Music size={26} strokeWidth={1.6} />
      </div>
      <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
        Connect YouTube Music
      </h2>
      <p className="mt-2 text-[13.5px] text-[var(--muted)] leading-relaxed max-w-md mx-auto">
        Sign in with your Google account to play your playlists and liked songs
        right here. Your tokens stay on this machine.
      </p>
      <a href="/api/youtube/auth" className="life-btn life-btn-primary mt-5 inline-flex">
        <Music size={15} strokeWidth={2} />
        Connect account
      </a>
      <p className="mt-4 text-[11.5px] text-[var(--muted-2)] leading-relaxed">
        Heads up: playback uses YouTube&apos;s embedded player, so you&apos;ll
        hear ads unless you have Premium (and are signed into YouTube in this
        browser).
      </p>
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="rounded-[14px] border border-[var(--line-2)] bg-[var(--paper)] p-7 max-w-2xl mx-auto" style={{ boxShadow: "var(--shadow-1)" }}>
      <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)] inline-flex items-center gap-2">
        <Music size={18} strokeWidth={1.7} className="text-[var(--terra)]" />
        One-time setup
      </h2>
      <p className="mt-2 text-[13.5px] text-[var(--muted)] leading-relaxed">
        YouTube Music has no public API, so Life OS connects through Google
        OAuth + the YouTube Data API. You need your own free Google Cloud
        credentials (≈ 5–10 minutes). It all stays local.
      </p>

      <ol className="mt-5 space-y-3">
        <Step n={1}>
          Open{" "}
          <ExtLink href="https://console.cloud.google.com/projectcreate">
            Google Cloud Console
          </ExtLink>{" "}
          and create a project (any name).
        </Step>
        <Step n={2}>
          In{" "}
          <ExtLink href="https://console.cloud.google.com/apis/library/youtube.googleapis.com">
            APIs &amp; Services → Library
          </ExtLink>
          , enable <Code>YouTube Data API v3</Code>.
        </Step>
        <Step n={3}>
          Under <Code>OAuth consent screen</Code>, choose <Code>External</Code>,
          fill the basics, add the scope <Code>youtube.readonly</Code>, and add
          your own email as a <Code>Test user</Code>. Leave it in Testing.
        </Step>
        <Step n={4}>
          Under <Code>Credentials → Create credentials → OAuth client ID</Code>,
          pick <Code>Web application</Code>. Add this Authorized redirect URI:
          <Code block>http://localhost:3000/api/youtube/callback</Code>
        </Step>
        <Step n={5}>
          Copy the Client ID + Client secret into a{" "}
          <Code>.env.local</Code> file in the project root:
          <Code block>
            {`YOUTUBE_CLIENT_ID=your-id\nYOUTUBE_CLIENT_SECRET=your-secret`}
          </Code>
        </Step>
        <Step n={6}>
          Restart the dev server, refresh this page, and hit{" "}
          <span className="font-medium text-[var(--ink)]">Connect</span>.
        </Step>
      </ol>

      <p className="mt-5 text-[11.5px] text-[var(--muted-2)] leading-relaxed">
        Note: while the consent screen stays in “Testing”, Google expires the
        login after ~7 days, so you&apos;ll reconnect occasionally. That&apos;s a
        Google limitation for unverified apps.
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid place-items-center w-6 h-6 rounded-full bg-[var(--terra-tint)] text-[var(--terra)] text-[11px] font-semibold tabular-nums shrink-0 mt-0.5">
        {n}
      </span>
      <div className="text-[13.5px] text-[var(--ink-2)] leading-relaxed">
        {children}
      </div>
    </li>
  );
}

function Code({
  children,
  block,
}: {
  children: React.ReactNode;
  block?: boolean;
}) {
  if (block) {
    return (
      <pre className="mt-2 rounded-[8px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[12px] font-mono text-[var(--ink)] whitespace-pre-wrap break-all">
        {children}
      </pre>
    );
  }
  return (
    <code className="rounded-[5px] bg-[var(--paper-2)] border border-[var(--line)] px-1.5 py-0.5 text-[12px] font-mono text-[var(--terra)]">
      {children}
    </code>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[var(--terra)] hover:underline underline-offset-2"
    >
      {children}
      <ExternalLink size={11} strokeWidth={1.7} />
    </a>
  );
}
