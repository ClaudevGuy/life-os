/**
 * Server-side helpers used by /api/ai/* routes to resolve which model handle
 * to pass to the AI SDK. Picks based on three request headers (sent by the
 * browser when a BYO credential is configured in /settings → AI):
 *
 *   Authorization:  Bearer <key>
 *   X-AI-Provider:  anthropic | openai
 *   X-AI-Model:     optional model override (e.g. "gpt-4o", "claude-sonnet-4.5")
 *
 * If no Authorization header is present, falls back to env vars based on the
 * fallback model's prefix:
 *   - "openai/..."         → @ai-sdk/openai reads OPENAI_API_KEY
 *   - anything else        → @ai-sdk/anthropic reads ANTHROPIC_API_KEY
 *
 * No gateway routing — Life OS talks to providers directly.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

type Provider = "anthropic" | "openai";

const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
};

/**
 * Anthropic model ids use DASHES between version numbers
 * (claude-haiku-4-5), but it's easy to save a dotted one (claude-haiku-4.5)
 * which the API rejects — the request then fails mid-stream and looks like a
 * hang. Repair dotted Claude ids defensively. (OpenAI ids legitimately use
 * dots, e.g. gpt-4.1, so only touch claude-*.)
 */
function normalizeModelId(id: string): string {
  if (/^claude/i.test(id)) return id.replace(/(\d)\.(\d)/g, "$1-$2");
  return id;
}

export function bearerKey(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function providerHeader(req: Request): Provider {
  const p = req.headers.get("x-ai-provider")?.toLowerCase();
  if (p === "openai" || p === "anthropic") return p;
  return "anthropic"; // back-compat: pre-multi-provider clients only set Authorization
}

function modelHeader(req: Request): string | null {
  return req.headers.get("x-ai-model")?.trim() || null;
}

/** Strip a "provider/" prefix from a model id, if present. */
function stripPrefix(model: string, provider: Provider): string {
  return model.replace(new RegExp(`^${provider}/`), "");
}

/**
 * Pick a provider for the env-driven fallback path. Reads LIFEOS_TEXT_MODEL
 * to figure out where the user wants to go; if it starts with "openai/",
 * route to OpenAI, otherwise Anthropic.
 */
function fallbackProvider(model: string): Provider {
  return model.toLowerCase().startsWith("openai/") ? "openai" : "anthropic";
}

/**
 * Returns a model handle for the AI SDK. The handle either has a bearer key
 * baked into it (BYO path) or reads its credentials from env (fallback path).
 */
export function buildModel(
  fallbackModel: string,
  req: Request,
): LanguageModel {
  const key = bearerKey(req);

  // BYO path: per-request credentials.
  if (key) {
    const provider = providerHeader(req);
    const requestedModel = modelHeader(req) ?? DEFAULT_MODEL[provider];
    if (provider === "openai") {
      const openai = createOpenAI({ apiKey: key });
      return openai(stripPrefix(requestedModel, "openai"));
    }
    const anthropic = createAnthropic({ apiKey: key });
    return anthropic(normalizeModelId(stripPrefix(requestedModel, "anthropic")));
  }

  // Fallback path: env-driven. The @ai-sdk/* providers each auto-read
  // their own env var (OPENAI_API_KEY / ANTHROPIC_API_KEY) when apiKey
  // isn't passed.
  const model = modelHeader(req) ?? fallbackModel;
  const provider = fallbackProvider(model);
  if (provider === "openai") {
    return createOpenAI()(stripPrefix(model, "openai"));
  }
  return createAnthropic()(normalizeModelId(stripPrefix(model, "anthropic")));
}
