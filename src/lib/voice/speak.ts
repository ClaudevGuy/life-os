"use client";

/**
 * Spoken responses for the voice assistant, via the browser's built-in speech
 * synthesis (free, on-device, no key). We pick the most natural English voice
 * available and let the user mute it. A future upgrade could route through a
 * cloud TTS for warmer voices, but this keeps it local-first by default.
 */

const TTS_KEY = "lifeos.voice.tts";

export function ttsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TTS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setTtsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(TTS_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer known-natural voices, then any en-US, then any English.
  const prefs = [
    /Samantha/i,
    /Google US English/i,
    /Microsoft (Aria|Jenny|Michelle|Zira)/i,
    /Ava|Allison|Serena/i,
  ];
  for (const re of prefs) {
    const v = voices.find((x) => re.test(x.name));
    if (v) return v;
  }
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang?.startsWith("en")) ??
    voices[0]
  );
}

/** Warm the voice list (it loads async on some browsers). */
export function primeVoices(): void {
  if (!ttsSupported()) return;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoice = pickVoice();
    };
  } catch {
    /* ignore */
  }
}

/** Speak `text` aloud. Cancels anything already speaking. */
export function speak(text: string, opts?: { onend?: () => void }): void {
  if (!ttsSupported() || !ttsEnabled() || !text.trim()) {
    opts?.onend?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.trim());
    const v = cachedVoice ?? (cachedVoice = pickVoice());
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = 1.03;
    u.pitch = 1.0;
    u.volume = 1.0;
    if (opts?.onend) {
      u.onend = () => opts.onend?.();
      u.onerror = () => opts.onend?.();
    }
    window.speechSynthesis.speak(u);
  } catch {
    opts?.onend?.();
  }
}

export function stopSpeaking(): void {
  if (!ttsSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}
