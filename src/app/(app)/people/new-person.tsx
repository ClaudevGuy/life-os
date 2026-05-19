"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { captureItem } from "@/lib/store/items";

export function NewPersonButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  function reset() {
    setName("");
    setHandle("");
    setOpen(false);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    startTransition(async () => {
      try {
        await captureItem({
          kind: "person",
          title: name.trim(),
          status: "active",
          metadata: { handle: handle.trim() || undefined },
        });
      } catch {
        toast.error("Failed");
        return;
      }
      toast.success("Added");
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs px-3 py-1.5 transition"
      >
        <Plus size={12} /> Add person
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="text-sm font-medium mb-4">Add person</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md bg-zinc-950 border border-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
          autoFocus
        />
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="Handle (optional, e.g. @daniel)"
          className="mt-2 w-full rounded-md bg-zinc-950 border border-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-zinc-100 text-zinc-900 px-3 py-1.5 text-xs font-medium hover:bg-white transition disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
