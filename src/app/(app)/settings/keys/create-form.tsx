"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreateKeyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create key");
      const data = (await res.json()) as { raw: string };
      setIssuedKey(data.raw);
      setName("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. claude-code, iphone-shortcut)"
          className="flex-1 rounded-md bg-zinc-950 border border-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="rounded-md bg-zinc-100 text-zinc-900 px-3 py-2 text-sm font-medium hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Plus size={14} />
          Create
        </button>
      </form>

      {issuedKey && (
        <div className="mt-4 rounded-md border border-amber-900/50 bg-amber-950/30 p-3">
          <div className="text-xs text-amber-300 mb-2">
            Copy this key now. You won&apos;t see it again.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-amber-100 break-all">
              {issuedKey}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(issuedKey);
                toast.success("Copied");
              }}
              className="rounded p-1.5 hover:bg-amber-900/40 text-amber-200"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
