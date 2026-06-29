# Whiteboard — Single Infinite Excalidraw Canvas

- **Date:** 2026-06-29
- **Status:** Design approved; spec under review
- **Feature:** A single, persistent, feature-rich infinite whiteboard in Life-OS

## Summary

One persistent, infinite [Excalidraw](https://github.com/excalidraw/excalidraw) canvas at `/whiteboard`, integrated into Life-OS chrome, theme, and local storage. A single canvas — not multiple boards, not boards-as-items, no gallery. Local-first persistence via a dedicated Dexie table; included in the JSON backup, excluded from Gist sync.

## Goals

- A beautiful, genuinely feature-rich infinite canvas using `@excalidraw/excalidraw` (MIT, no watermark).
- Reliable autosave and restore — both the scene and the last view (scroll + zoom).
- Visual theme synced with Life-OS (light / dark / cloudy).
- Isolated, independently testable components.

## Non-goals (YAGNI)

- Multiple boards, boards-as-items, or a board gallery.
- Cross-linking to notes / tasks / people, or global-search integration.
- Real-time multiplayer / collaboration.
- Cross-device Gist sync (v1 is local-only + JSON backup, per approved default).

## Architecture & components

Each unit has one clear purpose and a well-defined interface.

1. **Route — `src/app/(app)/whiteboard/page.tsx`**
   - Thin page; renders `<WhiteboardCanvas />` inside a full-height container below the top bar: `h-[calc(100vh-61px)] w-full relative`.

2. **Canvas wrapper — `src/components/whiteboard/whiteboard-canvas.tsx`** (`"use client"`)
   - Dynamically imports Excalidraw with `ssr: false` and imports its stylesheet.
   - Loads the initial scene from storage on mount and passes it as `initialData`.
   - Debounced autosave (~600 ms, trailing) on Excalidraw's `onChange(elements, appState, files)`.
   - Theme sync via `next-themes` `resolvedTheme` → Excalidraw `theme`.
   - Save-status indicator (`idle` / `saving` / `saved`).
   - Extra controls: **Reset view** and **Clear canvas** (with a `sonner` confirm).
   - Holds the `excalidrawAPI` ref for imperative actions (reset view, clear, flush).
   - **Depends on:** the storage module, `next-themes`, `sonner`.

3. **Storage module — `src/lib/store/whiteboard.ts`** (`"use client"`)
   - `loadScene(): Promise<StoredWhiteboard | null>`
   - `saveScene(scene: SceneInput): Promise<void>`
   - Owns the `StoredWhiteboard` type and all Dexie access for the canvas.
   - **Depends on:** Dexie `db`.

4. **DB schema — `src/lib/store/db.ts`**
   - Add `StoredWhiteboard` type.
   - Add `whiteboard!: EntityTable<StoredWhiteboard, "id">`.
   - Add `this.version(12).stores({ ...all existing stores, whiteboard: "id" })`.

5. **Sidebar — `src/components/sidebar-nav.tsx`**
   - Add to the **Capture** section after Notes: `{ href: "/whiteboard", label: "Whiteboard", icon: PenTool }` (import `PenTool` from `lucide-react`).

## Data model & persistence

- `StoredWhiteboard = { id: "main"; elements: ExcalidrawElement[]; appState: Partial<AppState>; files: BinaryFiles; updatedAt: Date }`.
- Exactly one row, `id: "main"`.
- Use Excalidraw's `serializeAsJSON` / `restore` helpers to strip non-serializable `appState` (e.g. the `collaborators` Map) on save and to rehydrate safely on load.
- Image assets (`files`) stored inline in the row for v1 — IndexedDB handles binary/data-URLs fine locally. (Future optimization: offload to the existing `blobs` table, mirroring note photos.)
- Persist `scrollX` / `scrollY` / `zoom` (part of `appState`) so the view is restored on return.
- **Backup:** include the `whiteboard` table in the JSON backup export/import path. **Exclude from Gist sync** (volume — mirrors the messaging/`appKV` precedent).

## Theme sync

- `next-themes` `useTheme().resolvedTheme`: `"dark"` → Excalidraw `THEME.DARK`; `"light"` and `"cloudy"` → `THEME.LIGHT`.
- Pass as the `theme` prop; update reactively on theme change.

## Autosave details

- `onChange` handler debounced ~600 ms (trailing edge).
- Single-table Dexie `put` only (avoids the documented `dexie-react-hooks` multi-table live-query cache bug noted in `items.ts`).
- Drives the save-status indicator.
- Flush any pending debounced save on unmount (best effort).

## Next.js / build integration (implementation prerequisites)

- Per `AGENTS.md`: **read the relevant guides under `node_modules/next/dist/docs/` before writing any code** — this Next.js (16.2.6, Turbopack) differs from defaults, especially for dynamic imports, client components, and CSS imports.
- Verify the `@excalidraw/excalidraw` version is compatible with React 19.2.4 + Next 16.2.6; pin it in `package.json`.
- Excalidraw is client-only: `dynamic(() => import("@excalidraw/excalidraw").then(m => m.Excalidraw), { ssr: false })`.
- Import `@excalidraw/excalidraw/index.css` (confirm the exact stylesheet path for the pinned version).
- The Excalidraw container must have an explicit height.

## Error handling

- Load failure → start with an empty canvas + a `sonner` error toast; never crash the route.
- Save failure → toast; retry naturally on the next change.
- Excalidraw dynamic-import failure → fallback UI with a reload hint.

## Feature set

Everything Excalidraw ships (freehand draw; rectangles / diamonds / ellipses; arrows & lines; text; images; eraser; reusable shape libraries; frames; laser pointer; color / stroke / fill styling; grouping; alignment; layering; multi-select; infinite zoom & pan; full undo/redo and keyboard shortcuts; PNG / SVG / clipboard export) plus the Life-OS extras above (autosave + view restore, theme sync, reset view, clear-with-confirm, save indicator).

## Testing / verification

Drive it through the Claude Preview MCP tool:

- Load `/whiteboard` → canvas renders, console is clean.
- Draw shapes → reload → scene **and** view persist.
- Toggle the Life-OS theme → Excalidraw theme follows.
- Clear canvas (confirm) empties it; Reset view recenters.
- Sidebar entry navigates to `/whiteboard` and shows as active.

## Decided defaults (adjustable)

- Persistence: **local-only + JSON backup** (not Gist-synced).
- Route / label / icon: `/whiteboard`, "Whiteboard", `PenTool`.
