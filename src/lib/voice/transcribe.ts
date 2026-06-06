"use client";

/**
 * High-accuracy speech-to-text via OpenAI Whisper, used as the precise layer of
 * the hybrid recognizer. The browser's Web Speech API gives instant live text;
 * when an OpenAI key is available we ALSO record the audio and send it here for
 * a markedly more accurate final transcript (punctuation, proper nouns, accents).
 *
 * The key is the user's own: a dedicated transcription key if they set one, else
 * their main AI key when that happens to be an OpenAI key. Audio is sent to the
 * user's own /api/voice/transcribe route and never stored.
 */
import { getCreds } from "@/lib/ai-key";

const TKEY = "lifeos.voice.transcribe-key";

/** A dedicated OpenAI key just for transcription (optional). */
export function getDedicatedTranscribeKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const k = window.localStorage.getItem(TKEY);
    return k && k.trim() ? k.trim() : null;
  } catch {
    return null;
  }
}

export function setDedicatedTranscribeKey(key: string | null): void {
  try {
    if (key && key.trim()) window.localStorage.setItem(TKEY, key.trim());
    else window.localStorage.removeItem(TKEY);
  } catch {
    /* ignore */
  }
}

/** The OpenAI key to transcribe with: dedicated, else the main key if it's OpenAI. */
export function getTranscribeKey(): string | null {
  const dedicated = getDedicatedTranscribeKey();
  if (dedicated) return dedicated;
  const creds = getCreds();
  if (creds?.provider === "openai" && creds.key) return creds.key;
  return null;
}

/** Is Whisper transcription usable right now? */
export function whisperAvailable(): boolean {
  return getTranscribeKey() !== null;
}

export function recordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export type AudioRecorder = {
  /** Resolve to the recorded audio, or null if nothing was captured. */
  stop: () => Promise<Blob | null>;
  /** Stop and discard. */
  cancel: () => void;
  stream: MediaStream;
};

/** Begin recording from a fresh mic stream. Returns null if unsupported/denied. */
export async function startRecording(): Promise<AudioRecorder | null> {
  if (!recordingSupported()) return null;
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }
  let mime = "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(m)) {
      mime = m;
      break;
    }
  }
  let mr: MediaRecorder;
  try {
    mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }
  const chunks: BlobPart[] = [];
  mr.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  try {
    mr.start();
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return null;
  }

  const stopTracks = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stream,
    cancel: () => {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
      stopTracks();
    },
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        mr.onstop = () => {
          stopTracks();
          resolve(
            chunks.length
              ? new Blob(chunks, { type: mr.mimeType || "audio/webm" })
              : null,
          );
        };
        try {
          mr.stop();
        } catch {
          stopTracks();
          resolve(null);
        }
      }),
  };
}

/** Send recorded audio to Whisper. Returns the transcript, or null on failure. */
export async function transcribeBlob(blob: Blob): Promise<string | null> {
  const key = getTranscribeKey();
  if (!key || blob.size === 0) return null;
  const ext = blob.type.includes("mp4")
    ? "mp4"
    : blob.type.includes("ogg")
      ? "ogg"
      : "webm";
  const fd = new FormData();
  fd.append("file", blob, `audio.${ext}`);
  try {
    const res = await fetch("/api/voice/transcribe", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { text?: string };
    const text = typeof j.text === "string" ? j.text.trim() : "";
    return text || null;
  } catch {
    return null;
  }
}
