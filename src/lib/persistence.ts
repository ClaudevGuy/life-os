/**
 * Local JSON-file persistence. No DB provider needed.
 *
 * Layout:
 *   ./data/lifeos.json
 *
 * The file holds every user's items. On first read we hydrate the in-memory
 * Map from disk; every mutation triggers a debounced atomic write
 * (write to .tmp + rename, so a crash during save can't corrupt the file).
 *
 * Dates serialize as ISO strings and are revived on load. Embeddings, jsonb
 * metadata, keyPoints arrays — all native JSON types, so they round-trip
 * losslessly.
 */
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Item } from "@/db/schema";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "lifeos.json");

type DiskShape = {
  version: 1;
  savedAt: string;
  users: Record<string, Item[]>;
};

const userItems = new Map<string, Item[]>();
let hydrated = false;

function reviveItem(raw: unknown): Item {
  const r = raw as Item & {
    capturedAt: string | Date;
    createdAt: string | Date;
    updatedAt: string | Date;
  };
  return {
    ...r,
    capturedAt: new Date(r.capturedAt),
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    if (!existsSync(DATA_FILE)) return;
    const raw = readFileSync(DATA_FILE, "utf-8");
    if (!raw.trim()) return;
    const data = JSON.parse(raw) as DiskShape;
    for (const [userId, items] of Object.entries(data.users ?? {})) {
      userItems.set(userId, items.map(reviveItem));
    }
  } catch (e) {
    console.error("[persistence] load failed:", e);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;
let saveQueuedAgain = false;

async function flush() {
  if (saving) {
    saveQueuedAgain = true;
    return;
  }
  saving = true;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data: DiskShape = {
      version: 1,
      savedAt: new Date().toISOString(),
      users: Object.fromEntries(userItems.entries()),
    };
    const tmp = DATA_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmp, DATA_FILE);
  } catch (e) {
    console.error("[persistence] save failed:", e);
  } finally {
    saving = false;
    if (saveQueuedAgain) {
      saveQueuedAgain = false;
      void flush();
    }
  }
}

export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flush();
  }, 150);
}

export function getStore(): Map<string, Item[]> {
  hydrate();
  return userItems;
}
