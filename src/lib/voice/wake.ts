"use client";

/**
 * "Hey Aria" wake word. An always-on background recognizer (Web Speech API,
 * continuous mode) that watches for the wake phrase and fires a callback.
 *
 * Opt-in: the mic stays off until the user flips the toggle in the assistant.
 * The browser shows its mic indicator while armed — that's honest and by
 * design. The recognizer auto-stops every so often, so we restart it in a
 * loop until told to stop; it's paused entirely while the assistant overlay
 * is open so the two never fight over the microphone.
 */

const WAKE_KEY = "lifeos.voice.wake";

export function wakeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WAKE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setWakeEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(WAKE_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

// Minimal Web Speech typings (mirrors lib/use-speech.ts, which keeps them private).
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function wakeSupported(): boolean {
  return (
    getCtor() !== null &&
    typeof window !== "undefined" &&
    window.isSecureContext
  );
}

/** "hey aria", "hi aria", "ok aria" — tolerant of commas and the Arya spelling. */
const WAKE_RE = /\b(?:hey|hi|ok|okay)[\s,]*(?:aria|arya)\b/i;

let rec: Recognition | null = null;
let armed = false;
let restartTimer: ReturnType<typeof setTimeout> | null = null;

export function startWake(onWake: () => void): void {
  if (armed || !wakeSupported()) return;
  armed = true;

  const spin = () => {
    if (!armed) return;
    const Ctor = getCtor();
    if (!Ctor) return;
    try {
      rec?.abort();
    } catch {
      /* ignore */
    }
    const r = new Ctor();
    r.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let heard = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        heard += e.results[i][0].transcript;
      }
      if (WAKE_RE.test(heard)) {
        stopWake();
        onWake();
      }
    };
    r.onerror = (e) => {
      // Mic blocked → give up and turn the preference off so the toggle is honest.
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        stopWake();
        setWakeEnabled(false);
        window.dispatchEvent(new CustomEvent("lifeos:wake-blocked"));
      }
    };
    r.onend = () => {
      // The recognizer times out periodically — keep it alive while armed.
      if (armed) restartTimer = setTimeout(spin, 400);
    };
    rec = r;
    try {
      r.start();
    } catch {
      /* already running — ignore */
    }
  };

  spin();
}

export function stopWake(): void {
  armed = false;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  try {
    rec?.abort();
  } catch {
    /* ignore */
  }
  rec = null;
}
