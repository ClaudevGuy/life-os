# Whiteboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single, persistent, feature-rich infinite Excalidraw whiteboard at `/whiteboard`, wired into Life-OS chrome, theme, storage, and backups.

**Architecture:** A server-component route renders a `"use client"` canvas wrapper that dynamically imports Excalidraw (`ssr: false`). The scene autosaves (debounced) to a dedicated single-row Dexie table and restores on mount. Theme follows the app via `next-themes`.

**Tech Stack:** Next.js 16.2.6 (App Router, Turbopack), React 19.2.4, TypeScript, Tailwind v4, Dexie 4, `@excalidraw/excalidraw`, `sonner`, `next-themes`.

## Global Constraints

- React 19.2.4 / Next 16.2.6 (Turbopack) / Dexie 4 / Tailwind v4 — copy existing patterns; do not upgrade or reconfigure these.
- **AGENTS.md:** read the relevant guide under `node_modules/next/dist/docs/` before writing code for a given concern. Confirmed pattern: client-only third-party components are wrapped in a `"use client"` module and dynamically imported with `ssr: false`.
- **No test framework exists** (only `dev`/`build`/`start` scripts). Do NOT add one (YAGNI). Verification = `npm run build` (typecheck/compile) + the Claude Preview MCP tool (render/interact/reload/console).
- **Commits deferred:** per user instruction, make NO commits until the user has reviewed the looks; then commit to **`main`** (no feature branch). Tasks below end at a verified state; the final task handles the single commit-to-main after approval.
- Excalidraw is client-only: import its CSS, dynamic-import with `ssr: false` inside a `"use client"` module.
- Persistence is **local-only** (Dexie) + **included in JSON backup**, **excluded from Gist sync**.
- Theme map: `resolvedTheme === "dark"` → Excalidraw `"dark"`, everything else (incl. `cloudy`) → `"light"`.

---

### Task 1: Install Excalidraw & stub the route

**Files:**
- Modify: `package.json` (dependency added by npm)
- Create: `src/app/(app)/whiteboard/page.tsx`
- Create: `src/components/whiteboard/whiteboard-canvas.tsx`

**Interfaces:**
- Produces: `WhiteboardCanvas` React component (named export) rendering `<Excalidraw />` full-size.

- [ ] **Step 1: Install the package**

Run: `npm install @excalidraw/excalidraw`
Expected: installs cleanly. If a React-19 peer-dependency error appears, install the newest version (which supports React 19) or, as a documented fallback, `npm install @excalidraw/excalidraw --legacy-peer-deps`. Record the resolved version.

- [ ] **Step 2: Create the canvas wrapper (minimal render first)**

```tsx
// src/components/whiteboard/whiteboard-canvas.tsx
"use client";

import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full grid place-items-center text-[var(--muted)]">
        Loading canvas…
      </div>
    ),
  },
);

export function WhiteboardCanvas() {
  return (
    <div className="relative h-full w-full">
      <Excalidraw />
    </div>
  );
}
```

- [ ] **Step 3: Create the route**

```tsx
// src/app/(app)/whiteboard/page.tsx
import { WhiteboardCanvas } from "@/components/whiteboard/whiteboard-canvas";

export default function WhiteboardPage() {
  return (
    <div className="h-[calc(100vh-61px)] w-full">
      <WhiteboardCanvas />
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: compiles with no type/lint errors involving the new files.

- [ ] **Step 5: Verify render (preview)**

Start the dev server (Claude Preview MCP), navigate to `/whiteboard`. Expected: Excalidraw canvas + toolbar render full-height; console clean. If Turbopack throws on the CSS/worker import, read `node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md` and adjust.

---

### Task 2: Dexie `whiteboard` table (v12)

**Files:**
- Modify: `src/lib/store/db.ts`

**Interfaces:**
- Produces: `StoredWhiteboard` type; `db.whiteboard` table (`EntityTable<StoredWhiteboard, "id">`).

- [ ] **Step 1: Add the type** (near the other `Stored*` types)

```ts
/** The single persisted infinite-canvas scene. One row, id = "main". */
export type StoredWhiteboard = {
  id: string;                       // always "main"
  elements: unknown[];              // Excalidraw elements (typed in the store module)
  appState: Record<string, unknown>; // whitelisted appState subset
  files: Record<string, unknown>;   // Excalidraw BinaryFiles
  updatedAt: Date;
};
```

- [ ] **Step 2: Declare the table field** (in the `LifeOSDB` class, with the other tables)

```ts
  whiteboard!: EntityTable<StoredWhiteboard, "id">;
```

- [ ] **Step 3: Add version 12** (after the `version(11)` block)

```ts
    // v12: single infinite whiteboard canvas (local-only).
    this.version(12).stores({
      items: "id, kind, status, capturedAt, topic, isPinned, [kind+status]",
      blobs: "id, createdAt",
      tombstones: "id, deletedAt",
      trash: "id, trashedAt, kind",
      dayNotes: "date, updatedAt",
      netWorthSnapshots: "date, updatedAt",
      vault: "id, type, updatedAt",
      healthLogs: "date, updatedAt",
      appKV: "key",
      exercises: "id, name, muscle, type, custom",
      workouts: "id, date, *focus",
      routines: "id, name",
      msgAccounts: "id, channel, status",
      msgThreads: "id, accountId, channel, lastTs",
      msgMessages: "id, threadId, accountId, ts",
      whiteboard: "id",
    });
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: compiles; no Dexie typing errors.

---

### Task 3: Storage module

**Files:**
- Create: `src/lib/store/whiteboard.ts`

**Interfaces:**
- Consumes: `db`, `StoredWhiteboard` from `./db`.
- Produces:
  - `loadScene(): Promise<LoadedScene | null>`
  - `saveScene(elements, appState, files): Promise<void>`
  - `type LoadedScene = { elements: ExcalidrawElement[]; appState: Partial<AppState>; files: BinaryFiles }`

- [ ] **Step 1: Write the module**

```ts
// src/lib/store/whiteboard.ts
"use client";

import { db, type StoredWhiteboard } from "./db";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const ROW_ID = "main";

// Only serializable, useful appState fields are persisted. The full appState
// holds transient/non-serializable values (e.g. a `collaborators` Map).
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
  await db.whiteboard.put(row); // single-table put — safe with dexie-react-hooks
}
```

- [ ] **Step 2: Verify build / type-import paths**

Run: `npm run build`
Expected: compiles. If the type imports error, confirm the exact export paths for the installed version (try `@excalidraw/excalidraw/types` for `AppState`/`BinaryFiles`/`ExcalidrawImperativeAPI` and `@excalidraw/excalidraw/element/types` for `ExcalidrawElement`; adjust to the version's actual paths).

---

### Task 4: Wire autosave + load into the canvas wrapper

**Files:**
- Modify: `src/components/whiteboard/whiteboard-canvas.tsx`

**Interfaces:**
- Consumes: `loadScene`, `saveScene`, `LoadedScene` from `@/lib/store/whiteboard`.
- Produces: stateful `WhiteboardCanvas` with debounced autosave + initial load + save badge.

- [ ] **Step 1: Replace the wrapper with the stateful version**

```tsx
// src/components/whiteboard/whiteboard-canvas.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { loadScene, saveScene, type LoadedScene } from "@/lib/store/whiteboard";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full grid place-items-center text-[var(--muted)]">
        Loading canvas…
      </div>
    ),
  },
);

type SaveStatus = "idle" | "saving" | "saved";

export function WhiteboardCanvas() {
  const { resolvedTheme } = useTheme();
  // undefined = still loading; null = no saved scene; object = restore it.
  const [initial, setInitial] = useState<LoadedScene | null | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    loadScene()
      .then((scene) => alive && setInitial(scene))
      .catch(() => {
        if (!alive) return;
        setInitial(null);
        toast.error("Couldn't load your canvas");
      });
    return () => {
      alive = false;
    };
  }, []);

  const onChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      setStatus("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveScene(elements, appState, files)
          .then(() => setStatus("saved"))
          .catch(() => {
            setStatus("idle");
            toast.error("Couldn't save canvas");
          });
      }, 600);
    },
    [],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (initial === undefined) {
    return (
      <div className="h-full w-full grid place-items-center text-[var(--muted)]">
        Loading canvas…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        initialData={initial ? { ...initial, scrollToContent: false } : null}
        onChange={onChange}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
      <span
        className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border border-[var(--line)] bg-[var(--paper)]/80 px-2.5 py-1 text-[11px] text-[var(--muted)] backdrop-blur"
        aria-live="polite"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Autosaves"}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build` → compiles.

- [ ] **Step 3: Verify persistence (preview)**

Navigate to `/whiteboard`, draw a few shapes, wait ~1s ("Saved ✓"), reload. Expected: shapes and view (scroll/zoom) persist. Console clean.

---

### Task 5: Theme sync + Reset view + Clear canvas

**Files:**
- Modify: `src/components/whiteboard/whiteboard-canvas.tsx`

**Interfaces:**
- Consumes: `apiRef` (`ExcalidrawImperativeAPI`): `scrollToContent`, `getSceneElements`, `updateScene`.

- [ ] **Step 1: Add a small controls cluster** (inside the wrapper's returned `<div>`, after the save badge)

```tsx
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => apiRef.current?.scrollToContent(undefined, { fitToContent: true })}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-[12px] text-[var(--ink-2)] hover:border-[var(--terra)] hover:text-[var(--terra)] transition"
        >
          Reset view
        </button>
        <button
          type="button"
          onClick={() => {
            if (!apiRef.current) return;
            if (!window.confirm("Clear the whole canvas? This can't be undone.")) return;
            apiRef.current.updateScene({ elements: [] });
            void saveScene([], apiRef.current.getAppState(), {});
            toast.success("Canvas cleared");
          }}
          className="rounded-[10px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 text-[12px] text-[var(--ink-2)] hover:border-[var(--bad)] hover:text-[var(--bad)] transition"
        >
          Clear
        </button>
      </div>
```

(Theme sync is already handled by the `theme={...}` prop from Task 4 reacting to `resolvedTheme`. If `scrollToContent`'s option name differs in the installed version, check the `excalidraw-api` docs and use the version's fit option.)

- [ ] **Step 2: Verify build** → `npm run build` compiles.

- [ ] **Step 3: Verify (preview)**

Toggle the Life-OS theme → Excalidraw switches light/dark. "Reset view" recenters; "Clear" (after confirm) empties and persists empty on reload.

---

### Task 6: Sidebar navigation entry

**Files:**
- Modify: `src/components/sidebar-nav.tsx`

- [ ] **Step 1: Import the icon** (add `PenTool` to the `lucide-react` import)

```ts
import {
  // …existing icons…
  PenTool,
} from "lucide-react";
```

- [ ] **Step 2: Add the nav item** (in the `Capture` section's `items`, right after the Notes entry)

```ts
      { href: "/notes", label: "Notes", icon: NotebookPen },
      { href: "/whiteboard", label: "Whiteboard", icon: PenTool },
```

- [ ] **Step 3: Verify (preview)**

Sidebar shows "Whiteboard" under Capture; clicking navigates to `/whiteboard` and highlights as active.

---

### Task 7: Include the canvas in JSON backups

**Files:**
- Modify: `src/lib/backup.ts`

**Interfaces:**
- Consumes: `db.whiteboard`.

- [ ] **Step 1: Add to `buildBackupObject`**

Add `db.whiteboard.toArray()` to the `Promise.all`, capture it, bump `schema` to `9`, and include `whiteboard` in the returned object:

```ts
  const [items, dayNotes, netWorthSnapshots, vault, whiteboard] =
    await Promise.all([
      db.items.toArray(),
      db.dayNotes.toArray(),
      db.netWorthSnapshots.toArray(),
      db.vault.toArray(),
      db.whiteboard.toArray(),
    ]);
```

```ts
  return {
    app: "life-os",
    schema: 9,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length },
    items,
    dayNotes,
    netWorthSnapshots,
    vault,
    vaultGuard,
    whiteboard,
  };
```

- [ ] **Step 2: Add to `restoreFromObject`** (before the `return`)

```ts
  const wb = revive(data.whiteboard, ["updatedAt"]);
  if (wb.length) await db.whiteboard.bulkPut(wb as never);
```

- [ ] **Step 3: Verify build** → `npm run build` compiles.

---

### Task 8: Full verification pass, show the looks, then commit to main

**Files:** none (verification + commit)

- [ ] **Step 1: End-to-end preview pass**

Via the Claude Preview MCP: `/whiteboard` renders; draw shapes, add text/arrow/image; reload → persists; toggle theme → follows; Reset view + Clear work; sidebar entry active; console clean across the run.

- [ ] **Step 2: Capture proof & show the user**

Take a screenshot (or, if the toolbar's animations block capture as before, a snapshot/inspect) and share how it looks. **Wait for the user's visual approval.**

- [ ] **Step 3: Commit to main (only after approval)**

Per the user's instruction (no feature branch). Stage the whiteboard files; if the user also wants the earlier top-bar z-index fix included, confirm and stage it separately.

```bash
git add src/app/(app)/whiteboard src/components/whiteboard src/lib/store/whiteboard.ts src/lib/store/db.ts src/components/sidebar-nav.tsx src/lib/backup.ts package.json package-lock.json docs/superpowers
git commit -m "feat: add infinite Excalidraw whiteboard (/whiteboard)"
```

---

## Self-Review

**Spec coverage:**
- Route + full-height page → Task 1. ✓
- Excalidraw client-only dynamic import + CSS → Tasks 1, 4. ✓
- Dedicated Dexie table (v12) → Task 2. ✓
- Storage module load/save + appState whitelist + view restore → Task 3. ✓
- Debounced autosave + save indicator + initial load + error handling → Task 4. ✓
- Theme sync + Reset view + Clear-with-confirm → Task 5. ✓
- Sidebar entry (Capture, PenTool) → Task 6. ✓
- JSON backup inclusion; Gist-sync exclusion (no change needed — Gist module isn't touched) → Task 7. ✓
- Verification via build + preview; commit-to-main deferred to visual approval → Task 8. ✓

**Placeholder scan:** No TBD/TODO. The two version-specific verifications (type-import paths in Task 3; `scrollToContent` option name in Task 5) include concrete fallbacks, not blanks.

**Type consistency:** `loadScene`/`saveScene`/`LoadedScene` signatures match between Task 3 (definition) and Task 4 (use). `StoredWhiteboard` shape matches between Task 2 and Task 3. `apiRef: ExcalidrawImperativeAPI` consistent in Tasks 4–5.
