"use client";

import { useCallback, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the standard DOM lib).
interface SpeechResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechEvent {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechResult };
}
interface SpeechErrorEvent {
  error?: string;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
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

/**
 * Live speech-to-text via the browser's built-in recognizer. No API key.
 * Requires a secure context (https or localhost) and a user gesture to start.
 */
export function useSpeechRecognition() {
  const [supported] = useState(
    () =>
      getCtor() !== null &&
      (typeof window === "undefined" || window.isSecureContext),
  );
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }
    // Tear down any previous instance so start() can't throw InvalidState.
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    setError(null);
    setInterim("");
    const rec = new Ctor();
    rec.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let fin = "";
      let intr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else intr += r[0].transcript;
      }
      if (fin) {
        setTranscript((t) => `${t ? `${t} ` : ""}${fin}`.replace(/\s+/g, " ").trim());
      }
      setInterim(intr);
    };
    rec.onerror = (e) => {
      setError(e?.error || "error");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      // start() throws if it's already running — ignore.
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    setTranscript,
    start,
    stop,
    reset,
  };
}
