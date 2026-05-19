import { db } from "@/db/client";
import { apiKeys } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getViewerId, safeQuery } from "@/lib/viewer";
import { CreateKeyForm } from "./create-form";
import { RevokeButton } from "./revoke-button";

export const metadata = { title: "API Keys · Life OS" };
export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const userId = await getViewerId();

  const keys = await safeQuery(
    () =>
      db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          prefix: apiKeys.prefix,
          createdAt: apiKeys.createdAt,
          lastUsedAt: apiKeys.lastUsedAt,
        })
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
        .orderBy(desc(apiKeys.createdAt)),
    [],
  );

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">API keys</h1>
      <p className="text-sm text-zinc-500 mt-1">
        Bearer tokens for Claude Code, iOS Shortcuts, and external tools.
      </p>

      <div className="mt-8">
        <CreateKeyForm />
      </div>

      <div className="mt-8 rounded-lg border border-zinc-900 divide-y divide-zinc-900 overflow-hidden">
        {keys.length === 0 && (
          <div className="px-4 py-6 text-sm text-zinc-600 text-center">
            No keys yet.
          </div>
        )}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{k.name}</div>
              <div className="text-xs text-zinc-500 font-mono mt-0.5">
                {k.prefix}…
                <span className="ml-3 text-zinc-600">
                  {k.lastUsedAt
                    ? `last used ${formatRel(k.lastUsedAt)}`
                    : "never used"}
                </span>
              </div>
            </div>
            <RevokeButton id={k.id} />
          </div>
        ))}
      </div>

      <div className="mt-10 text-xs text-zinc-600 space-y-2">
        <p className="font-medium text-zinc-500">Usage</p>
        <pre className="rounded bg-zinc-950 border border-zinc-900 p-3 overflow-x-auto font-mono text-zinc-400">
{`curl -X POST https://your-domain/api/v1/capture \\
  -H "Authorization: Bearer lifeos_..." \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"bookmark","sourceUrl":"https://example.com"}'`}
        </pre>
      </div>
    </div>
  );
}

function formatRel(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
