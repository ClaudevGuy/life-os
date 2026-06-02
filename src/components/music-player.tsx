"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Music,
} from "lucide-react";
import type { Track } from "@/lib/youtube-types";

// ── Minimal typings for the YouTube IFrame Player API ─────────────────────

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type YTStateEvent = { data: number };

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          height?: string;
          width?: string;
          videoId?: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: YTStateEvent) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ── Context ───────────────────────────────────────────────────────────────

type MusicValue = {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  close: () => void;
};

const MusicContext = createContext<MusicValue | null>(null);

export function useMusic(): MusicValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within <MusicProvider>");
  return ctx;
}

// ── Provider (lives in the app shell, so playback survives navigation) ─────

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs mirror state so the (stable) onStateChange closure reads fresh values.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const indexRef = useRef(index);
  indexRef.current = index;
  const positionRef = useRef(position);
  positionRef.current = position;
  const pendingRef = useRef<string | null>(null);

  const loadIndex = useCallback((i: number) => {
    const track = queueRef.current[i];
    if (!track) return;
    setIndex(i);
    indexRef.current = i;
    setPosition(0);
    if (playerRef.current) {
      playerRef.current.loadVideoById(track.videoId);
      setIsPlaying(true);
    } else {
      // Player still booting — play this as soon as it's ready.
      pendingRef.current = track.videoId;
      setIsPlaying(true);
    }
  }, []);

  const next = useCallback(() => {
    const ni = indexRef.current + 1;
    if (ni < queueRef.current.length) loadIndex(ni);
    else setIsPlaying(false);
  }, [loadIndex]);

  const prev = useCallback(() => {
    if (positionRef.current > 3) {
      playerRef.current?.seekTo(0, true);
      setPosition(0);
      return;
    }
    const pi = indexRef.current - 1;
    if (pi >= 0) loadIndex(pi);
    else playerRef.current?.seekTo(0, true);
  }, [loadIndex]);

  // Boot the IFrame API once and create a single, long-lived player.
  useEffect(() => {
    let cancelled = false;
    function create() {
      if (cancelled || !hostRef.current || playerRef.current || !window.YT) {
        return;
      }
      playerRef.current = new window.YT.Player(hostRef.current, {
        height: "100%",
        width: "100%",
        videoId: "",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            setReady(true);
            if (pendingRef.current) {
              playerRef.current?.loadVideoById(pendingRef.current);
              pendingRef.current = null;
            }
          },
          onStateChange: (e) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (e.data === 1) setIsPlaying(true);
            else if (e.data === 2) setIsPlaying(false);
            else if (e.data === 0) next();
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      create();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        create();
      };
    }
    return () => {
      cancelled = true;
    };
  }, [next]);

  // Poll progress while the player exists.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        setPosition(p.getCurrentTime() || 0);
        setDuration(p.getDuration() || 0);
      } catch {
        // player not ready for these calls yet
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [ready]);

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      setQueue(tracks);
      queueRef.current = tracks;
      loadIndex(startIndex);
    },
    [loadIndex],
  );

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else p.playVideo();
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setPosition(seconds);
  }, []);

  const close = useCallback(() => {
    playerRef.current?.stopVideo();
    setQueue([]);
    setIndex(-1);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  const current = index >= 0 ? (queue[index] ?? null) : null;

  const value: MusicValue = {
    queue,
    index,
    current,
    isPlaying,
    position,
    duration,
    playQueue,
    toggle,
    next,
    prev,
    seek,
    close,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      <MiniPlayer
        hostRef={hostRef}
        current={current}
        isPlaying={isPlaying}
        position={position}
        duration={duration}
        onToggle={toggle}
        onNext={next}
        onPrev={prev}
        onSeek={seek}
        onClose={close}
      />
    </MusicContext.Provider>
  );
}

// ── Mini-player bar ───────────────────────────────────────────────────────

function MiniPlayer({
  hostRef,
  current,
  isPlaying,
  position,
  duration,
  onToggle,
  onNext,
  onPrev,
  onSeek,
  onClose,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  current: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (s: number) => void;
  onClose: () => void;
}) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    // Always mounted (keeps the iframe/player alive); fades in when playing.
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(460px,calc(100vw-2rem))] transition-all duration-300 ${
        current
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      <div
        className="rounded-[16px] border border-[var(--line-2)] bg-[var(--paper)] overflow-hidden"
        style={{ boxShadow: "var(--shadow-3)" }}
      >
        {/* Seek bar */}
        <button
          type="button"
          aria-label="Seek"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            if (duration > 0) onSeek(ratio * duration);
          }}
          className="block w-full h-1 bg-[var(--bg-2)] group"
        >
          <span
            className="block h-full bg-[var(--terra)] transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </button>

        <div className="flex items-center gap-3 p-2.5">
          {/* The actual YouTube player — small but visible. */}
          <div className="w-[64px] h-[40px] rounded-[8px] overflow-hidden bg-black shrink-0">
            <div ref={hostRef} className="w-full h-full" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-[var(--ink)] truncate leading-tight">
              {current?.title ?? "Nothing playing"}
            </div>
            <div className="text-[11.5px] text-[var(--muted)] truncate mt-0.5">
              {current?.channel ?? ""}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <IconBtn label="Previous" onClick={onPrev}>
              <SkipBack size={15} strokeWidth={1.8} />
            </IconBtn>
            <button
              type="button"
              onClick={onToggle}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="grid place-items-center w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition shrink-0"
            >
              {isPlaying ? (
                <Pause size={16} strokeWidth={2} fill="currentColor" />
              ) : (
                <Play size={16} strokeWidth={2} fill="currentColor" />
              )}
            </button>
            <IconBtn label="Next" onClick={onNext}>
              <SkipForward size={15} strokeWidth={1.8} />
            </IconBtn>
            <Link
              href="/music"
              title="Open Music"
              className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
            >
              <Music size={14} strokeWidth={1.7} />
            </Link>
            <IconBtn label="Close" onClick={onClose}>
              <X size={14} strokeWidth={1.8} />
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid place-items-center w-7 h-7 rounded-[7px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-2)] transition"
    >
      {children}
    </button>
  );
}
