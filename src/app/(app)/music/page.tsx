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
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  ChevronLeft,
  Loader2,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useMusic } from "@/components/music-player";
import type { Playlist, Track } from "@/lib/youtube-types";

type Status = { configured: boolean; connected: boolean; name: string | null };

const VIBES = [
  "var(--terra)",
  "var(--gold)",
  "var(--sage)",
  "var(--plum)",
  "var(--sky)",
];

/** Deterministic accent per title — gives each playlist/track a colour vibe. */
function vibeColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return VIBES[Math.abs(h) % VIBES.length];
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(s: number): string {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

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
      <div className="relative min-h-full">
        <MusicBackdrop />
        <div className="relative p-8 max-w-6xl mx-auto pg-enter">
          <Header />
          <div className="mt-10 flex items-center justify-center text-[var(--muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <MusicBackdrop />
      <div className="relative p-8 max-w-6xl mx-auto pg-enter">
        <Header name={status.connected ? status.name : null} />
        {!status.configured ? (
          <SetupGuide />
        ) : !status.connected ? (
          <ConnectScreen />
        ) : (
          <Connected onDisconnected={loadStatus} />
        )}
      </div>
    </div>
  );
}

// ── Minimal musical backdrop ───────────────────────────────────────────────

function MusicBackdrop() {
  const NOTES = [
    { top: "14%", left: "9%", size: 86, rot: -14, o: 0.05 },
    { top: "33%", left: "85%", size: 58, rot: 12, o: 0.045 },
    { top: "63%", left: "23%", size: 112, rot: -8, o: 0.04 },
    { top: "75%", left: "71%", size: 74, rot: 16, o: 0.05 },
    { top: "50%", left: "53%", size: 46, rot: -6, o: 0.035 },
    { top: "88%", left: "42%", size: 64, rot: 9, o: 0.035 },
  ];
  const N = 72;
  const barW = 1200 / N - 5;
  const bars = Array.from({ length: N }, (_, i) => ({
    x: (i / N) * 1200,
    h: 12 + 30 * Math.abs(Math.sin(i * 0.55)) + 18 * Math.abs(Math.sin(i * 0.21 + 1)),
  }));

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* warm wash from the top */}
      <div
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(110% 70% at 50% -12%, color-mix(in oklch, var(--terra) 9%, transparent), transparent 72%)",
        }}
      />
      {/* a faint soundwave across the page */}
      <svg
        className="absolute left-0 right-0 w-full opacity-[0.06]"
        style={{ top: "37%" }}
        height={120}
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="mwave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--terra)" />
            <stop offset="50%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--sky)" />
          </linearGradient>
        </defs>
        {bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={40 - b.h / 2}
            width={barW}
            height={b.h}
            rx={barW / 2}
            fill="url(#mwave)"
          />
        ))}
      </svg>
      {/* a few oversized, whisper-faint notes */}
      {NOTES.map((n, i) => (
        <Music
          key={i}
          size={n.size}
          strokeWidth={1.1}
          className="absolute text-[var(--terra)]"
          style={{
            top: n.top,
            left: n.left,
            opacity: n.o,
            transform: `rotate(${n.rot}deg)`,
          }}
        />
      ))}
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

// ── Connected ─────────────────────────────────────────────────────────────

type View =
  | { type: "library" }
  | { type: "playlist"; pl: Playlist }
  | { type: "search"; q: string };

function Connected({ onDisconnected }: { onDisconnected: () => void }) {
  const music = useMusic();
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [view, setView] = useState<View>({ type: "library" });
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [query, setQuery] = useState("");
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

  const fetchTracks = useCallback(async (pl: Playlist): Promise<Track[]> => {
    const res = await fetch(
      `/api/youtube/items?playlistId=${encodeURIComponent(pl.id)}`,
    );
    const data = await res.json();
    return (data.tracks ?? []) as Track[];
  }, []);

  const openPlaylist = useCallback(
    async (pl: Playlist) => {
      setView({ type: "playlist", pl });
      setTracks(null);
      setLoadingTracks(true);
      try {
        setTracks(await fetchTracks(pl));
      } catch {
        setTracks([]);
      } finally {
        setLoadingTracks(false);
      }
    },
    [fetchTracks],
  );

  const playPlaylist = useCallback(
    async (pl: Playlist, shuffle = false) => {
      try {
        const t = await fetchTracks(pl);
        if (!t.length) {
          toast.error("That playlist is empty");
          return;
        }
        music.playQueue(shuffle ? shuffled(t) : t, 0, pl.title);
      } catch {
        toast.error("Couldn't play that");
      }
    },
    [fetchTracks, music],
  );

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setView({ type: "library" });
      return;
    }
    setView({ type: "search", q });
    setTracks(null);
    setSearching(true);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {
      setTracks([]);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setView({ type: "library" });
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
      {music.current && <NowPlaying />}

      {/* Search + account */}
      <div className="mb-7 flex items-center gap-3">
        <form
          onSubmit={runSearch}
          className="flex-1 flex items-center gap-2 rounded-full bg-[var(--paper)] border border-[var(--line)] focus-within:border-[var(--terra)] px-4 h-11 transition"
        >
          <Search
            size={16}
            strokeWidth={1.7}
            className="text-[var(--muted)] shrink-0"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a song, artist, anything…"
            className="flex-1 bg-transparent text-[14.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear"
              className="grid place-items-center w-5 h-5 rounded-full text-[var(--muted)] hover:text-[var(--ink)] transition shrink-0"
            >
              <X size={14} strokeWidth={1.8} />
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

      {view.type === "library" &&
        (playlists === null ? (
          <GridSkeleton />
        ) : (
          <Library
            playlists={playlists}
            onOpen={openPlaylist}
            onPlay={(pl) => playPlaylist(pl)}
          />
        ))}

      {view.type === "playlist" && (
        <PlaylistDetail
          playlist={view.pl}
          tracks={tracks ?? []}
          loading={loadingTracks}
          onBack={() => setView({ type: "library" })}
          onPlayAll={() =>
            tracks && music.playQueue(tracks, 0, view.pl.title)
          }
          onShuffle={() =>
            tracks && music.playQueue(shuffled(tracks), 0, view.pl.title)
          }
        />
      )}

      {view.type === "search" && (
        <section>
          <SectionTitle icon={<Search size={15} strokeWidth={1.8} />}>
            {searching ? "Searching…" : `Results for “${view.q}”`}
          </SectionTitle>
          <TrackTable
            tracks={tracks ?? []}
            loading={searching}
            sourceLabel={`Search · ${view.q}`}
          />
        </section>
      )}
    </>
  );
}

// ── Now Playing hero (spinning vinyl) ─────────────────────────────────────

function NowPlaying() {
  const m = useMusic();
  const t = m.current;
  if (!t) return null;
  const color = vibeColor(t.title);

  function shuffleCurrent() {
    if (m.queue.length) m.playQueue(shuffled(m.queue), 0, m.source);
  }

  return (
    <section
      className="relative overflow-hidden rounded-[20px] border border-[var(--line-2)] mb-7"
      style={{ boxShadow: "var(--shadow-2)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, color-mix(in oklch, ${color} 26%, var(--paper)) 0%, var(--paper) 58%)`,
        }}
      />
      <div className="relative p-6 sm:p-7 flex items-center gap-6 flex-wrap sm:flex-nowrap">
        <Vinyl track={t} color={color} spinning={m.isPlaying} />

        <div className="min-w-0 flex-1 w-full">
          <div
            className="text-[10.5px] uppercase tracking-[0.18em] font-semibold inline-flex items-center gap-2"
            style={{ color }}
          >
            {m.isPlaying ? "Now playing" : "Paused"}
            {m.source && (
              <span className="text-[var(--muted-2)] tracking-[0.12em] normal-case font-medium">
                from {m.source}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-[24px] sm:text-[30px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--ink)] truncate">
            {t.title}
          </h2>
          <div className="mt-1 text-[14px] text-[var(--muted)] truncate">
            {t.channel}
          </div>

          {/* Progress */}
          <div className="mt-4">
            <SeekBar
              position={m.position}
              duration={m.duration}
              onSeek={m.seek}
              color={color}
            />
            <div className="mt-1.5 flex justify-between text-[11px] font-mono tabular-nums text-[var(--muted-2)]">
              <span>{fmtTime(m.position)}</span>
              <span>{fmtTime(m.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 flex items-center gap-1.5">
            <CtrlBtn label="Shuffle" onClick={shuffleCurrent}>
              <Shuffle size={16} strokeWidth={1.8} />
            </CtrlBtn>
            <CtrlBtn label="Previous" onClick={m.prev}>
              <SkipBack size={18} strokeWidth={1.8} fill="currentColor" />
            </CtrlBtn>
            <button
              type="button"
              onClick={m.toggle}
              aria-label={m.isPlaying ? "Pause" : "Play"}
              className="grid place-items-center w-12 h-12 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition"
              style={{ background: color }}
            >
              {m.isPlaying ? (
                <Pause size={20} strokeWidth={2} fill="currentColor" />
              ) : (
                <Play size={20} strokeWidth={2} fill="currentColor" className="ml-0.5" />
              )}
            </button>
            <CtrlBtn label="Next" onClick={m.next}>
              <SkipForward size={18} strokeWidth={1.8} fill="currentColor" />
            </CtrlBtn>
            <CtrlBtn
              label="Repeat"
              active={m.repeat}
              activeColor={color}
              onClick={m.toggleRepeat}
            >
              <Repeat size={16} strokeWidth={1.8} />
            </CtrlBtn>
          </div>
        </div>
      </div>
    </section>
  );
}

function Vinyl({
  track,
  color,
  spinning,
}: {
  track: Track;
  color: string;
  spinning: boolean;
}) {
  return (
    <div className="relative w-[128px] h-[128px] sm:w-[150px] sm:h-[150px] shrink-0 mx-auto sm:mx-0">
      <div
        className="vinyl-spin absolute inset-0 rounded-full grid place-items-center"
        style={{
          animationPlayState: spinning ? "running" : "paused",
          background:
            "repeating-radial-gradient(circle at center, #16151a 0px, #16151a 2px, #232228 3px, #16151a 4px)",
          boxShadow: "var(--shadow-2), inset 0 0 18px rgba(0,0,0,0.6)",
        }}
      >
        {/* Label = artwork */}
        <div className="relative w-[46%] h-[46%] rounded-full overflow-hidden border-[3px] border-black/30">
          {track.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full grid place-items-center"
              style={{ background: color }}
            >
              <Music size={18} className="text-white" strokeWidth={1.8} />
            </div>
          )}
          {/* center hole */}
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[var(--paper)] border border-black/40" />
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({
  label,
  onClick,
  active,
  activeColor,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  activeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid place-items-center w-9 h-9 rounded-full transition hover:bg-[color-mix(in_oklch,var(--ink)_8%,transparent)]"
      style={{
        color: active ? activeColor ?? "var(--terra)" : "var(--muted)",
      }}
    >
      {children}
    </button>
  );
}

function SeekBar({
  position,
  duration,
  onSeek,
  color,
}: {
  position: number;
  duration: number;
  onSeek: (s: number) => void;
  color: string;
}) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <button
      type="button"
      aria-label="Seek"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        if (duration > 0) onSeek(ratio * duration);
      }}
      className="group block w-full h-1.5 rounded-full bg-[var(--bg-2)] overflow-hidden"
    >
      <span
        className="block h-full rounded-full transition-[width]"
        style={{ width: `${pct}%`, background: color }}
      />
    </button>
  );
}

// ── Library (playlist cover grid) ─────────────────────────────────────────

function Library({
  playlists,
  onOpen,
  onPlay,
}: {
  playlists: Playlist[];
  onOpen: (pl: Playlist) => void;
  onPlay: (pl: Playlist) => void;
}) {
  return (
    <section>
      <SectionTitle icon={<ListMusic size={15} strokeWidth={1.8} />}>
        Your library
      </SectionTitle>
      {playlists.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No playlists found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 life-stagger">
          {playlists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              onOpen={() => onOpen(pl)}
              onPlay={() => onPlay(pl)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PlaylistCard({
  playlist: pl,
  onOpen,
  onPlay,
}: {
  playlist: Playlist;
  onOpen: () => void;
  onPlay: () => void;
}) {
  const color = vibeColor(pl.title);
  return (
    <div
      onClick={onOpen}
      className="group life-card life-card-hover p-3 cursor-pointer"
    >
      <div
        className="relative aspect-square rounded-[10px] overflow-hidden mb-3 grid place-items-center"
        style={{
          background: `color-mix(in oklch, ${color} 22%, var(--paper-2))`,
        }}
      >
        {pl.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pl.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ListMusic size={30} strokeWidth={1.5} style={{ color }} />
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          aria-label={`Play ${pl.title}`}
          className="absolute bottom-2 right-2 grid place-items-center w-10 h-10 rounded-full text-white shadow-lg opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 transition"
          style={{ background: color }}
        >
          <Play size={16} strokeWidth={2} fill="currentColor" className="ml-0.5" />
        </button>
      </div>
      <div className="text-[13.5px] font-semibold text-[var(--ink)] truncate">
        {pl.title}
      </div>
      <div className="text-[11.5px] text-[var(--muted-2)] font-mono mt-0.5">
        {pl.count != null ? `${pl.count} tracks` : "Playlist"}
      </div>
    </div>
  );
}

// ── Playlist detail ───────────────────────────────────────────────────────

function PlaylistDetail({
  playlist: pl,
  tracks,
  loading,
  onBack,
  onPlayAll,
  onShuffle,
}: {
  playlist: Playlist;
  tracks: Track[];
  loading: boolean;
  onBack: () => void;
  onPlayAll: () => void;
  onShuffle: () => void;
}) {
  const color = vibeColor(pl.title);
  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[12.5px] text-[var(--muted)] hover:text-[var(--ink)] transition mb-4"
      >
        <ChevronLeft size={14} strokeWidth={1.8} />
        Library
      </button>

      <div className="flex items-end gap-5 mb-6 flex-wrap">
        <div
          className="relative w-[120px] h-[120px] rounded-[14px] overflow-hidden grid place-items-center shrink-0"
          style={{
            background: `color-mix(in oklch, ${color} 22%, var(--paper-2))`,
            boxShadow: "var(--shadow-2)",
          }}
        >
          {pl.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pl.thumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <ListMusic size={40} strokeWidth={1.4} style={{ color }} />
          )}
        </div>

        <div className="min-w-0">
          <div
            className="text-[10.5px] uppercase tracking-[0.16em] font-semibold"
            style={{ color }}
          >
            Playlist
          </div>
          <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.025em] leading-[1.1] text-[var(--ink)]">
            {pl.title}
          </h2>
          <div className="mt-1 text-[12.5px] text-[var(--muted)] font-mono">
            {tracks.length || pl.count || 0} tracks
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onPlayAll}
              disabled={!tracks.length}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-white text-[13px] font-semibold shadow-sm hover:scale-[1.03] active:scale-95 transition disabled:opacity-50"
              style={{ background: color }}
            >
              <Play size={14} strokeWidth={2} fill="currentColor" />
              Play
            </button>
            <button
              type="button"
              onClick={onShuffle}
              disabled={!tracks.length}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] font-medium text-[var(--ink-2)] border border-[var(--line)] hover:bg-[var(--paper-2)] transition disabled:opacity-50"
            >
              <Shuffle size={14} strokeWidth={1.8} />
              Shuffle
            </button>
          </div>
        </div>
      </div>

      <TrackTable tracks={tracks} loading={loading} sourceLabel={pl.title} />
    </section>
  );
}

// ── Track list ────────────────────────────────────────────────────────────

function TrackTable({
  tracks,
  loading,
  sourceLabel,
}: {
  tracks: Track[];
  loading: boolean;
  sourceLabel: string;
}) {
  const music = useMusic();

  if (loading) return <RowSkeleton rows={6} />;
  if (tracks.length === 0) {
    return (
      <p className="text-[13px] text-[var(--muted)] px-2 py-6">Nothing here.</p>
    );
  }

  return (
    <div
      className="rounded-[14px] border border-[var(--line)] bg-[var(--paper)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      {tracks.map((t, i) => {
        const playing = music.current?.videoId === t.videoId;
        const color = vibeColor(t.title);
        return (
          <button
            key={`${t.videoId}-${i}`}
            type="button"
            onClick={() => music.playQueue(tracks, i, sourceLabel)}
            className={`group flex items-center gap-3 w-full px-3 py-2.5 text-left transition ${
              i > 0 ? "border-t border-[var(--line)]" : ""
            } ${playing ? "bg-[var(--paper-2)]" : "hover:bg-[var(--paper-2)]"}`}
          >
            {/* Index / equalizer */}
            <div className="w-5 grid place-items-center shrink-0">
              {playing ? (
                <Equalizer color={color} />
              ) : (
                <span className="text-[12px] font-mono tabular-nums text-[var(--muted-2)] group-hover:hidden">
                  {i + 1}
                </span>
              )}
              {!playing && (
                <Play
                  size={13}
                  strokeWidth={2}
                  fill="currentColor"
                  className="hidden group-hover:block text-[var(--ink)]"
                />
              )}
            </div>

            <div className="w-10 h-10 rounded-[7px] overflow-hidden shrink-0 bg-[var(--bg-2)]">
              {t.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className={`text-[13.5px] truncate ${
                  playing
                    ? "font-semibold"
                    : "text-[var(--ink)]"
                }`}
                style={playing ? { color } : undefined}
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

function Equalizer({ color }: { color: string }) {
  return (
    <span className="flex items-end gap-[2px] h-3.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="eq-bar w-[2.5px] h-full rounded-full"
          style={{
            background: color,
            animationDelay: `${i * 0.14}s`,
            animationDuration: `${0.7 + (i % 3) * 0.12}s`,
          }}
        />
      ))}
    </span>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-4 inline-flex items-center gap-2 text-[16px] font-semibold tracking-[-0.015em] text-[var(--ink)]">
      <span className="text-[var(--terra)]">{icon}</span>
      {children}
    </h2>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="life-card p-3">
          <div className="aspect-square rounded-[10px] bg-[var(--bg-2)] animate-pulse mb-3" />
          <div className="h-3.5 w-3/4 rounded bg-[var(--bg-2)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-[10px] bg-[var(--bg-2)] animate-pulse"
        />
      ))}
    </div>
  );
}

// ── Not connected ─────────────────────────────────────────────────────────

function ConnectScreen() {
  return (
    <div
      className="relative overflow-hidden rounded-[16px] border border-[var(--line-2)] p-8 text-center max-w-xl mx-auto"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 130% at 50% 0%, color-mix(in oklch, var(--terra) 18%, var(--paper)) 0%, var(--paper) 60%)",
        }}
      />
      <div className="relative">
        <div className="mx-auto mb-4 grid place-items-center w-[60px] h-[60px] rounded-full bg-[var(--terra)] text-white shadow-lg">
          <Music size={26} strokeWidth={1.8} />
        </div>
        <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--ink)]">
          Connect YouTube Music
        </h2>
        <p className="mt-2 text-[13.5px] text-[var(--muted)] leading-relaxed max-w-md mx-auto">
          Sign in with your Google account to play your playlists and liked
          songs right here. Your tokens stay on this machine.
        </p>
        <a
          href="/api/youtube/auth"
          className="life-btn life-btn-primary mt-5 inline-flex"
        >
          <Music size={15} strokeWidth={2} />
          Connect account
        </a>
        <p className="mt-4 text-[11.5px] text-[var(--muted-2)] leading-relaxed">
          Heads up: playback uses YouTube&apos;s embedded player, so you&apos;ll
          hear ads unless you have Premium (and are signed into YouTube in this
          browser).
        </p>
      </div>
    </div>
  );
}

function SetupGuide() {
  return (
    <div
      className="rounded-[14px] border border-[var(--line-2)] bg-[var(--paper)] p-7 max-w-2xl mx-auto"
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--ink)] inline-flex items-center gap-2">
        <Music size={18} strokeWidth={1.7} className="text-[var(--terra)]" />
        One-time setup
      </h2>
      <p className="mt-2 text-[13.5px] text-[var(--muted)] leading-relaxed">
        YouTube Music has no public API, so Life OS connects through Google
        OAuth + the YouTube Data API. You need your own free Google Cloud
        credentials (≈ 5–10 minutes). It all stays local. Google recently
        renamed the OAuth consent screen to{" "}
        <span className="font-medium text-[var(--ink-2)]">
          Google Auth Platform
        </span>{" "}
        — the steps below use its current tabs.
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
          Open{" "}
          <ExtLink href="https://console.cloud.google.com/auth/overview">
            Google Auth Platform
          </ExtLink>
          . First time through, the wizard asks for an app name, your email,
          and <Code>User type → External</Code>.
        </Step>
        <Step n={4}>
          On the <Code>Audience</Code> tab: make sure <Code>User type</Code> is{" "}
          <Code>External</Code> (keep status <Code>Testing</Code>), then under{" "}
          <Code>Test users</Code> click <Code>Add users</Code> and add your own
          Google account.
        </Step>
        <Step n={5}>
          On the <Code>Data access</Code> tab: <Code>Add or remove scopes</Code>{" "}
          → add <Code>youtube.readonly</Code> → Update &amp; Save.
        </Step>
        <Step n={6}>
          On the <Code>Clients</Code> tab: <Code>Create client</Code> →{" "}
          <Code>Web application</Code>. Add this Authorized redirect URI:
          <Code block>http://localhost:3000/api/youtube/callback</Code>
        </Step>
        <Step n={7}>
          Copy the Client ID + secret into a <Code>.env.local</Code> file in the
          project root:
          <Code block>
            {`YOUTUBE_CLIENT_ID=your-id\nYOUTUBE_CLIENT_SECRET=your-secret`}
          </Code>
        </Step>
        <Step n={8}>
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

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
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
