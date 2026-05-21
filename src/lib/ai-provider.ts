/**
 * Server-side helpers used by /api/ai/* routes to resolve which model handle
 * to pass to the AI SDK. Picks based on three request headers (sent by the
 * browser when a BYO credential is configured in /settings → AI):
 *
 *   Authorization:  Bearer <key>
 *   X-AI-Provider:  anthropic | openai | gateway
 *   X-AI-Model:     optional model override (e.g. "gpt-4o", "claude-sonnet-4.5")
 *
 * If no Authorization header is present, falls back to passing the raw model
 * string to the AI SDK — which uses AI_GATEWAY_API_KEY (or, on Vercel, the
 * auto-injected OIDC token) to route via the AI Gateway.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGateway } from "@ai-sdk/gateway";
import type { LanguageModel } from "ai";

type Provider = "anthropic" | "openai" | "gateway";

const DEFAULT_MODEL: Record<Provider, string> = {
  anthropic: "claude-haiku-4.5",
  openai: "gpt-4o-mini",
  gateway: "anthropic/claude-haiku-4.5",
};

export function bearerKey(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function providerHeader(req: Request): Provider {
  const p = req.headers.get("x-ai-provider")?.toLowerCase();
  if (p === "openai" || p === "gateway" || p === "anthropic") return p;
  return "anthropic"; // back-compat: pre-multi-provider clients only set Authorization
}

function modelHeader(req: Request): string | null {
  return req.headers.get("x-ai-model")?.trim() || null;
}

/**
 * Returns a model handle (or a model-id string) for the AI SDK.
 * `fallbackModel` is the deployment-wide default (env var or hardcoded);
 * it's only used when the request did not provide its own credentials.
 */
export function buildModel(
  fallbackModel: string,
  req: Request,
): LanguageModel | string {
  const key = bearerKey(req);

  // No BYO credentials — use the deployment-wide gateway path.
  if (!key) {
    return modelHeader(req) ?? fallbackModel;
  }

  const provider = providerHeader(req);
  const requestedModel = modelHeader(req) ?? DEFAULT_MODEL[provider];

  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: key });
    return openai(requestedModel);
  }

  if (provider === "gateway") {
    const gateway = createGateway({ apiKey: key });
    return gateway(requestedModel);
  }

  // Default: Anthropic.
  const anthropic = createAnthropic({ apiKey: key });
  // Tolerate "anthropic/..." prefixed model ids by stripping the prefix.
  const m = requestedModel.replace(/^anthropic\//, "");
  return anthropic(m);
}

/**
 * Back-compat wrapper for the old call site. Same behavior as `buildModel`
 * but only used by routes that haven't been migrated yet. Safe to delete
 * after both routes are using `buildModel`.
 */
export function providerWithKey(
  modelString: string,
  userKey: string | null,
): LanguageModel | string {
  if (!userKey) return modelString;
  const anthropic = createAnthropic({ apiKey: userKey });
  return anthropic(modelString.replace(/^anthropic\//, ""));
}
