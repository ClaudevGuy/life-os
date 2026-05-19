/**
 * User-supplied AI key (Vercel AI Gateway or Anthropic).
 * Stored in localStorage so it persists across sessions. The key never leaves
 * the user's browser except as an Authorization header on /api/ai/* requests
 * to their own deployment.
 */
"use client";

const STORAGE_KEY = "lifeos.ai-key";

export function getAiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAiKey(key: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (key && key.trim()) {
      window.localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* quota / disabled storage — silently ignore */
  }
}

/** Build the headers object for a fetch to /api/ai/*. */
export function aiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const key = getAiKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}
