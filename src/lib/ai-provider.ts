/**
 * Server-side helpers used by /api/ai/* routes to resolve which AI provider
 * + key to use for the current request.
 *
 * Precedence:
 *   1. Authorization: Bearer <key>  → user pasted their own key in /settings.
 *      Treated as an Anthropic API key; routed through @ai-sdk/anthropic
 *      directly so we don't depend on the AI Gateway being configured.
 *   2. No header → fall back to passing the raw model-string ("anthropic/x")
 *      to the AI SDK, which resolves it via AI_GATEWAY_API_KEY or, on Vercel,
 *      the auto-injected OIDC token.
 */
import { createAnthropic } from "@ai-sdk/anthropic";

export function bearerKey(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/**
 * Returns a model handle for `generateText({ model: ... })`. The AI SDK accepts
 * either a string (gateway path) or a provider-built model (direct path).
 */
export function providerWithKey(
  modelString: string,
  userKey: string | null,
) {
  if (!userKey) return modelString;
  const modelName = modelString.replace(/^anthropic\//, "");
  const anthropic = createAnthropic({ apiKey: userKey });
  return anthropic(modelName);
}
