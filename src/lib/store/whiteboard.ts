"use client";

/**
 * Persistence for the single infinite whiteboard canvas. Reads/writes the one
 * `whiteboard` row (id = "main") in IndexedDB via Dexie. Local-only — included
 * in the JSON backup, excluded from Gist sync.
 */
import { db, type StoredWhiteboard } from "./db";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const ROW_ID = "main";

/**
 * Only these appState fields are persisted. The full Excalidraw appState holds
 * transient / non-serializable values (e.g. a `collaborators` Map), so we keep
 * a small whitelist — enough to restore the look and the last view.
 */
const APPSTATE_KEYS = [
  "viewBackgroundColor",
  "scrollX",
  "scrollY",
  "zoom",
  "gridModeEnabled",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
] as const;

export type LoadedScene = {
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

export async function loadScene(): Promise<LoadedScene | null> {
  const row = await db.whiteboard.get(ROW_ID);
  if (!row) return null;
  return {
    elements: (row.elements as ExcalidrawElement[]) ?? [],
    appState: (row.appState as Partial<AppState>) ?? {},
    files: (row.files as BinaryFiles) ?? {},
  };
}

export async function saveScene(
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): Promise<void> {
  const trimmed: Record<string, unknown> = {};
  const src = appState as unknown as Record<string, unknown>;
  for (const k of APPSTATE_KEYS) trimmed[k] = src[k];

  const row: StoredWhiteboard = {
    id: ROW_ID,
    elements: elements.filter(
      (el) => !(el as { isDeleted?: boolean }).isDeleted,
    ) as unknown[],
    appState: trimmed,
    files: (files ?? {}) as Record<string, unknown>,
    updatedAt: new Date(),
  };
  // Single-table put — safe with dexie-react-hooks' live-query cache.
  await db.whiteboard.put(row);
}
