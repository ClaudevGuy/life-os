"use client";

/**
 * The Life OS voice assistant — a hands-free, Siri-like overlay that listens,
 * understands, acts, and (optionally) speaks back.
 *
 * Capture is hybrid: the browser's Web Speech API gives instant live text and
 * tells us when you've stopped talking; when an OpenAI key is present we also
 * record the audio and transcribe it with Whisper for a far more accurate final.
 * The transcript goes to /api/ai/command (Claude tool-use), whose reply is read
 * aloud and whose tool calls drive the app (navigate, complete a task, start a
 * focus timer, switch theme, create things, answer questions).
 *
 * Mounted once at the app layout via <VoiceAssistantProvider>; open it from the
 * mic button, useVoiceAssistant().open(), or the global ⌘⇧V / Ctrl+Shift+V.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mic,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Repeat,
  ArrowRight,
  Loader2,
  KeyRound,
  Check,
  Ear,
} from "lucide-react";
import { Portal } from "@/components/portal";
import { useSpeechRecognition } from "@/lib/use-speech";
import {
  startRecording,
  transcribeBlob,
  whisperAvailable,
  recordingSupported,
  getDedicatedTranscribeKey,
  setDedicatedTranscribeKey,
  type AudioRecorder,
} from "@/lib/voice/transcribe";
import {
  streamCommand,
  executeCommand,
  type Turn,
  type CommandResult,
} from "@/lib/voice/commands";
import {
  startWake,
  stopWake,
  wakeEnabled,
  setWakeEnabled,
  wakeSupported,
} from "@/lib/voice/wake";
import {
  speak,
  stopSpeaking,
  ttsEnabled,
  setTtsEnabled,
  ttsSupported,
  primeVoices,
} from "@/lib/voice/speak";

// ── Provider / context ─────────────────────────────────────────────────────────

type Ctx = { open: () => void };
const VoiceCtx = createContext<Ctx>({ open: () => {} });
export const useVoiceAssistant = () => useContext(VoiceCtx);

export function VoiceAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const value = useMemo<Ctx>(() => ({ open: () => setOpen(true) }), []);

  // Global hotkey: ⌘⇧V (mac) / Ctrl+Shift+V.
  useEffect(() => {
    primeVoices();
    function onKey(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.key === "v" || e.key === "V")
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // "Hey Aria" wake word — armed only while the preference is on and the
  // overlay is closed (so the two recognizers never fight over the mic).
  useEffect(() => {
    setWakeOn(wakeEnabled() && wakeSupported());
    function onPref(e: Event) {
      setWakeOn(Boolean((e as CustomEvent<{ on?: boolean }>).detail?.on));
    }
    function onBlocked() {
      setWakeOn(false);
    }
    window.addEventListener("lifeos:wake-pref", onPref);
    window.addEventListener("lifeos:wake-blocked", onBlocked);
    return () => {
      window.removeEventListener("lifeos:wake-pref", onPref);
      window.removeEventListener("lifeos:wake-blocked", onBlocked);
    };
  }, []);

  useEffect(() => {
    if (!wakeOn || open) {
      stopWake();
      return;
    }
    startWake(() => setOpen(true));
    return () => stopWake();
  }, [wakeOn, open]);

  return (
    <VoiceCtx.Provider value={value}>
      {children}
      {open && <VoiceOverlay onClose={() => setOpen(false)} />}
    </VoiceCtx.Provider>
  );
}

/** Top-bar trigger button. */
export function VoiceButton() {
  const { open } = useVoiceAssistant();
  return (
    <button
      type="button"
      onClick={open}
      title="Voice assistant (⌘⇧V)"
      aria-label="Voice assistant"
      className="focus-hide grid place-items-center w-[30px] h-[30px] rounded-[10px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:text-[var(--terra)] hover:border-[var(--terra)] transition"
    >
      <Mic size={15} strokeWidth={1.7} />
    </button>
  );
}

// ── The overlay ────────────────────────────────────────────────────────────────

type Phase = "idle" | "listening" | "thinking" | "speaking";

function friendlyError(m: string): string {
  if (/api[\s-]?key|apikey|missing|unauthor|401|403/i.test(m))
    return "No AI key set. Add one in Settings → AI to use voice commands.";
  if (/rate|429|quota/i.test(m))
    return "The assistant is rate-limited right now — try again in a moment.";
  return m.length > 140 ? "Something went wrong reaching the assistant." : m;
}

const ERR_MSG: Record<string, string> = {
  "not-allowed":
    "Microphone access is blocked. Allow it from the address bar, then try again.",
  "service-not-allowed": "Microphone access is blocked in this browser.",
  "no-speech": "Didn't catch anything — try again.",
  "audio-capture": "No microphone found.",
  network: "The speech service is unavailable right now.",
  unsupported:
    "Live voice needs Chrome or Edge over https/localhost. You can still type a command.",
};

function VoiceOverlay({ onClose }: { onClose: () => void }) {
  const sr = useSpeechRecognition();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [reply, setReply] = useState("");
  const [actions, setActions] = useState<CommandResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tts, setTts] = useState(true);
  const [continuous, setContinuous] = useState(true);
  const [wake, setWake] = useState(false);
  const [typed, setTyped] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [hasWhisper, setHasWhisper] = useState(false);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<Turn[]>([]);
  const navigatedRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  const closedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    setTts(ttsEnabled());
    setHasWhisper(whisperAvailable());
    setWake(wakeEnabled() && wakeSupported());
    try {
      setContinuous(localStorage.getItem("lifeos.voice.continuous") !== "off");
    } catch {
      /* ignore */
    }
  }, []);

  const clearSilence = () => {
    if (silenceRef.current) {
      clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
  };

  // ── Cleanup on close ──
  const cleanup = useCallback(() => {
    closedRef.current = true;
    clearSilence();
    stopSpeaking();
    try {
      sr.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current?.cancel();
    recorderRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reset on (re)mount — React Strict Mode mounts, unmounts (running cleanup,
    // which flips closedRef), then remounts; without this the live instance
    // would think it's already closed and silently ignore commands.
    closedRef.current = false;
    return () => cleanup();
  }, [cleanup]);

  // Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cleanup();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, cleanup]);

  // ── Listening ──
  const beginListening = useCallback(async () => {
    if (closedRef.current) return;
    stopSpeaking();
    setReply("");
    setActions([]);
    setErrorMsg(null);
    navigatedRef.current = false;
    sr.reset();

    const canRecord = whisperAvailable() && recordingSupported();
    if (!sr.supported && !canRecord) {
      // No live recognizer here — let the user type instead.
      setPhase("idle");
      setErrorMsg(ERR_MSG.unsupported);
      return;
    }

    setPhase("listening");
    // Precise layer: record audio for Whisper when a key is available.
    if (canRecord) {
      recorderRef.current = await startRecording();
    }
    if (sr.supported) sr.start();
  }, [sr]);

  // Auto-start listening when the overlay opens.
  useEffect(() => {
    const t = setTimeout(() => beginListening(), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence detection: when speech pauses ~1.6s after we've heard something,
  // auto-submit. Resets every time new words arrive.
  useEffect(() => {
    if (phase !== "listening") return;
    const text = (sr.transcript + " " + sr.interim).trim();
    if (!text) return;
    clearSilence();
    silenceRef.current = setTimeout(() => {
      void endAndProcess();
    }, 1600);
    return clearSilence;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr.transcript, sr.interim, phase]);

  // ── Stop + process ──
  const endAndProcess = useCallback(async () => {
    if (phaseRef.current !== "listening") return;
    clearSilence();
    setPhase("thinking");
    try {
      sr.stop();
    } catch {
      /* ignore */
    }

    // Prefer the precise Whisper transcript when we recorded one.
    let text = sr.transcript.trim();
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec) {
      const blob = await rec.stop();
      if (blob) {
        const precise = await transcribeBlob(blob);
        if (precise) text = precise;
      }
    }

    if (!text) {
      setPhase("idle");
      setErrorMsg(sr.error ? ERR_MSG[sr.error] ?? null : "Didn't catch that.");
      return;
    }
    await processText(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sr]);

  const processText = useCallback(
    async (text: string) => {
      if (closedRef.current) return;
      setPhase("thinking");
      setReply("");
      setActions([]);
      setErrorMsg(null);
      navigatedRef.current = false;

      let acc = "";
      const applied: CommandResult[] = [];
      let errored: string | null = null;

      await streamCommand(text, historyRef.current, {
        onText: (d) => {
          acc += d;
          setReply(acc);
        },
        onAction: async (a) => {
          const r = await executeCommand(a, {
            navigate: (href) => {
              navigatedRef.current = true;
              router.push(href);
            },
          });
          if (r) {
            applied.push(r);
            setActions([...applied]);
          }
        },
        onError: (m) => {
          errored = m;
        },
      });

      historyRef.current.push({ role: "user", text });

      // Page digests (readPage) carry exact prose to read aloud — append it to
      // the model's short lead-in, on screen and out loud.
      const digestSpeech = applied
        .map((a) => a.speech)
        .filter((s): s is string => Boolean(s))
        .join(" ");
      const spoken =
        [acc.trim(), digestSpeech].filter(Boolean).join(" ") ||
        (applied[0]?.label ? `${applied[0].label}.` : "") ||
        (errored ? "" : "Done.");
      if (digestSpeech) {
        setReply([acc.trim(), digestSpeech].filter(Boolean).join(" "));
      }
      if (spoken) historyRef.current.push({ role: "assistant", text: spoken });

      if (errored && !acc.trim() && applied.length === 0) {
        setPhase("idle");
        setErrorMsg(friendlyError(errored));
        return;
      }

      // Speak, then either close (if we navigated) or resume / rest.
      setPhase("speaking");
      const afterSpeak = () => {
        if (closedRef.current) return;
        if (navigatedRef.current) {
          cleanup();
          onClose();
          return;
        }
        if (continuous) beginListening();
        else setPhase("idle");
      };
      if (tts && ttsSupported() && spoken) {
        speak(spoken, { onend: afterSpeak });
      } else {
        // No TTS — pause long enough to actually read the reply (longer for
        // page digests), then continue.
        const ms = Math.min(
          9000,
          Math.max(navigatedRef.current && !digestSpeech ? 600 : 1400, spoken.length * 38),
        );
        setTimeout(afterSpeak, ms);
      }
    },
    [router, tts, continuous, beginListening, cleanup, onClose],
  );

  function toggleListen() {
    if (phase === "listening") void endAndProcess();
    else if (phase === "idle") void beginListening();
    else {
      // thinking/speaking → interrupt and listen again
      stopSpeaking();
      void beginListening();
    }
  }

  function submitTyped() {
    const t = typed.trim();
    if (!t) return;
    setTyped("");
    void processText(t);
  }

  function saveKey() {
    setDedicatedTranscribeKey(keyInput.trim() || null);
    setHasWhisper(whisperAvailable());
    setKeyInput("");
    setShowKey(false);
  }

  const liveText = (sr.transcript + (sr.interim ? ` ${sr.interim}` : "")).trim();
  const engine = hasWhisper ? "Whisper" : sr.supported ? "Browser speech" : "Type";

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[140] flex items-center justify-center px-4 bg-black/55 backdrop-blur-md"
        onClick={() => {
          cleanup();
          onClose();
        }}
      >
        <div
          className="relative w-full max-w-lg rounded-[26px] border border-[var(--line-2)] bg-[var(--paper)] life-rise overflow-hidden"
          style={{ boxShadow: "var(--shadow-3)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* top accent */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, var(--terra), var(--gold), var(--terra))",
            }}
          />

          {/* header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--ink)]">
              <Sparkles size={14} className="text-[var(--terra)]" />
              Aria
              <span className="text-[10px] font-medium text-[var(--muted-2)] uppercase tracking-[0.12em] border border-[var(--line)] rounded-full px-1.5 py-[1px]">
                {engine}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                cleanup();
                onClose();
              }}
              aria-label="Close"
              className="grid place-items-center w-8 h-8 rounded-[9px] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition"
            >
              <X size={14} />
            </button>
          </div>

          {/* orb */}
          <div className="flex flex-col items-center px-6 pt-3 pb-2">
            <button
              type="button"
              onClick={toggleListen}
              className="relative grid place-items-center w-28 h-28 rounded-full transition active:scale-95"
              aria-label={phase === "listening" ? "Stop" : "Listen"}
              style={{
                background:
                  phase === "listening"
                    ? "radial-gradient(circle at 50% 40%, var(--terra), color-mix(in oklch, var(--terra) 75%, #000))"
                    : phase === "speaking"
                      ? "radial-gradient(circle at 50% 40%, var(--gold), color-mix(in oklch, var(--gold) 70%, #000))"
                      : "color-mix(in oklch, var(--terra) 12%, transparent)",
                color:
                  phase === "listening" || phase === "speaking"
                    ? "#fff"
                    : "var(--terra)",
              }}
            >
              {(phase === "listening" || phase === "speaking") && (
                <>
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background:
                        phase === "speaking" ? "var(--gold)" : "var(--terra)",
                      opacity: 0.22,
                    }}
                  />
                  <span
                    className="absolute -inset-3 rounded-full border animate-pulse"
                    style={{
                      borderColor:
                        phase === "speaking"
                          ? "color-mix(in oklch, var(--gold) 40%, transparent)"
                          : "color-mix(in oklch, var(--terra) 40%, transparent)",
                    }}
                  />
                </>
              )}
              {phase === "thinking" ? (
                <Loader2 size={34} className="animate-spin" />
              ) : phase === "speaking" ? (
                <Volume2 size={34} />
              ) : (
                <Mic size={36} strokeWidth={1.7} />
              )}
            </button>
            <p className="mt-3 text-[12.5px] text-[var(--muted)] h-[18px]">
              {phase === "listening"
                ? "Listening… tap when done"
                : phase === "thinking"
                  ? "Thinking…"
                  : phase === "speaking"
                    ? "Speaking…"
                    : "Tap to speak"}
            </p>
          </div>

          {/* transcript / reply (digests can run long — keep it scrollable) */}
          <div className="px-6 pb-2 min-h-[40px] max-h-44 overflow-y-auto">
            {phase === "listening" && liveText && (
              <p className="text-center text-[15px] text-[var(--ink)] leading-snug">
                {liveText}
              </p>
            )}
            {reply && (
              <p className="text-center text-[15px] text-[var(--ink)] leading-relaxed">
                {reply}
              </p>
            )}
            {errorMsg && (
              <p className="text-center text-[12.5px] text-[var(--bad)] leading-snug">
                {errorMsg}
              </p>
            )}
          </div>

          {/* action chips */}
          {actions.length > 0 && (
            <div className="px-6 pb-2 flex flex-col gap-1.5">
              {actions.map((a, i) =>
                a.href && a.href.startsWith("/") ? (
                  <Link
                    key={i}
                    href={a.href}
                    onClick={() => {
                      cleanup();
                      onClose();
                    }}
                    className="flex items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 hover:border-[var(--terra)] transition"
                  >
                    <span className="grid place-items-center w-5 h-5 rounded-full bg-[var(--sage-tint)] text-[var(--sage)] shrink-0">
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                    <span className="text-[13px] font-medium text-[var(--ink)] flex-1 truncate">
                      {a.label}
                      {a.sub ? (
                        <span className="text-[var(--muted)] font-normal">
                          {" "}
                          · {a.sub}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight size={13} className="text-[var(--muted-2)]" />
                  </Link>
                ) : (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2"
                  >
                    <span className="grid place-items-center w-5 h-5 rounded-full bg-[var(--sage-tint)] text-[var(--sage)] shrink-0">
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                    <span className="text-[13px] font-medium text-[var(--ink)]">
                      {a.label}
                      {a.sub ? (
                        <span className="text-[var(--muted)] font-normal">
                          {" "}
                          · {a.sub}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {/* typed fallback */}
          <div className="px-6 pb-2">
            <div className="flex items-center gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitTyped();
                }}
                placeholder="…or type a command"
                className="flex-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
              />
              <button
                type="button"
                onClick={submitTyped}
                disabled={!typed.trim()}
                className="grid place-items-center w-9 h-9 rounded-[10px] bg-[var(--terra)] text-white disabled:opacity-40 transition"
                aria-label="Send"
              >
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* footer controls */}
          <div className="flex items-center gap-1.5 px-5 py-3 border-t border-[var(--line)] flex-wrap">
            <FootToggle
              on={tts}
              onClick={() => {
                const next = !tts;
                setTts(next);
                setTtsEnabled(next);
                if (!next) stopSpeaking();
              }}
              icon={tts ? Volume2 : VolumeX}
              label={tts ? "Voice on" : "Voice off"}
              title="Speak replies aloud"
            />
            <FootToggle
              on={continuous}
              onClick={() => {
                const next = !continuous;
                setContinuous(next);
                try {
                  localStorage.setItem(
                    "lifeos.voice.continuous",
                    next ? "on" : "off",
                  );
                } catch {
                  /* ignore */
                }
              }}
              icon={Repeat}
              label="Conversation"
              title="Keep listening for follow-ups"
            />
            {wakeSupported() && (
              <FootToggle
                on={wake}
                onClick={() => {
                  const next = !wake;
                  setWake(next);
                  setWakeEnabled(next);
                  window.dispatchEvent(
                    new CustomEvent("lifeos:wake-pref", {
                      detail: { on: next },
                    }),
                  );
                }}
                icon={Ear}
                label="“Hey Aria”"
                title="Listen in the background and open when you say Hey Aria"
              />
            )}
            {!hasWhisper && (
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                title="Add an OpenAI key for Whisper-grade accuracy"
                className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[var(--line)] text-[11.5px] text-[var(--muted)] hover:text-[var(--terra)] hover:border-[var(--terra)] transition"
              >
                <KeyRound size={12} />
                Whisper
              </button>
            )}
          </div>

          {/* whisper key inline setup */}
          {showKey && !hasWhisper && (
            <div className="px-5 pb-4 -mt-1">
              <p className="text-[11.5px] text-[var(--muted)] mb-2 leading-relaxed">
                Paste an OpenAI key to transcribe with Whisper for top accuracy.
                Stored locally; used only for your voice.
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveKey();
                  }}
                  type="password"
                  placeholder="sk-…"
                  className="flex-1 rounded-[10px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13px] font-mono text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
                />
                <button
                  type="button"
                  onClick={saveKey}
                  disabled={!keyInput.trim()}
                  className="life-btn life-btn-sm life-btn-primary disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {getDedicatedTranscribeKey() && (
            <p className="px-5 pb-3 -mt-1 text-[10.5px] text-[var(--muted-2)]">
              Whisper key set ·{" "}
              <button
                type="button"
                className="underline hover:text-[var(--terra)]"
                onClick={() => {
                  setDedicatedTranscribeKey(null);
                  setHasWhisper(whisperAvailable());
                }}
              >
                remove
              </button>
            </p>
          )}
        </div>
      </div>
    </Portal>
  );
}

function FootToggle({
  on,
  onClick,
  icon: Icon,
  label,
  title,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition border"
      style={{
        background: on ? "var(--terra-tint)" : "transparent",
        color: on ? "var(--terra)" : "var(--muted)",
        borderColor: on ? "color-mix(in oklch, var(--terra) 30%, transparent)" : "var(--line)",
      }}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}
