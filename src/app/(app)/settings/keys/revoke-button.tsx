"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRevoke() {
    if (!confirm("Revoke this key? Any clients using it will stop working.")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success("Key revoked");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onRevoke}
      className="text-zinc-600 hover:text-red-400 transition p-1.5 rounded disabled:opacity-50"
      aria-label="Revoke key"
    >
      <Trash2 size={14} />
    </button>
  );
}
