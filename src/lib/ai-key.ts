/**
 * Client-side AI credentials. Stored in localStorage so they persist across
 * sessions. Credentials never leave the browser except as headers on
 * `/api/ai/*` requests to the user's own deployment.
 *
 * Three supported providers:
 *
 *   - "anthropic" — direct via @ai-sdk/anthropic. Get a key at
 *     console.anthropic.com.
 *   - "openai"   — direct via @ai-sdk/openai. Get a key at
 *     platform.openai.com/api-keys.
 *   - "gateway"  — Vercel AI Gateway. One key, any model. Set the model
 *     field to provider/model, e.g. "google/gemini-2.5-flash" or
 *     "openai/gpt-4o-mini". Get a key at vercel.com/dashboard/ai-gateway.
 */
"use client";

export type AiProvider = "anthropic" | "openai" | "gateway";

export type AiCreds = {
  provider: AiProvider;
  key: string;
  /** Optional model override. Empty/undefined → server default per provider. */
  model?: string;
};

const STORAGE_KEY = "lifeos.ai-key";

function read(): AiCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // New JSON shape
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as Partial<AiCreds>;
      if (
        parsed &&
        typeof parsed.key === "string" &&
        (parsed.provider === "anthropic" ||
          parsed.provider === "openai" ||
          parsed.provider === "gateway")
      ) {
        return {
          provider: parsed.provider,
          key: parsed.key,
          model:
            typeof parsed.model === "string" && parsed.model.trim()
              ? parsed.model.trim()
              : undefined,
        };
      }
      return null;
    }
    // Legacy: plain string = treat as Anthropic key (pre-multi-provider).
    return { provider: "anthropic", key: raw };
  } catch {
    return null;
  }
}

function write(creds: AiCreds | null): void {
  if (typeof window === "undefined") return;
  try {
    if (creds && creds.key.trim()) {
      const clean: AiCreds = {
        provider: creds.provider,
        key: creds.key.trim(),
        ...(creds.model?.trim() ? { model: creds.model.trim() } : {}),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* quota / disabled storage — silently ignore */
  }
}

export function getCreds(): AiCreds | null {
  return read();
}
export function setCreds(creds: AiCreds | null): void {
  write(creds);
}

/** Build headers for a fetch to /api/ai/*. */
export function aiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const creds = read();
  if (creds) {
    headers.Authorization = `Bearer ${creds.key}`;
    headers["x-ai-provider"] = creds.provider;
    if (creds.model) headers["x-ai-model"] = creds.model;
  }
  return headers;
}

/* ───────────────────────────────────────────────────────────────────────────
 * Legacy named exports — kept so any caller still using the old single-key
 * API doesn't break. Treat as Anthropic-only.
 * ─────────────────────────────────────────────────────────────────────── */
export function getAiKey(): string | null {
  return read()?.key ?? null;
}
export function setAiKey(key: string | null): void {
  write(key ? { provider: "anthropic", key } : null);
}
