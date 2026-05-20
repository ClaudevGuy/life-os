# Life OS

> Capture, organize, and recall everything you care about — notes, tasks, decisions, people, daily journals — in one place. **Local-first**: every byte lives in your browser, never on someone else's server.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-149eca) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![IndexedDB](https://img.shields.io/badge/storage-IndexedDB-f0a868)

---

## What this is

Life OS is a personal knowledge manager built around a single idea: **your second brain should belong to you, fully**. There is no signup, no database to provision, no SaaS subscription. You open the app, you start capturing. Your items, journals, photos, and habits live inside your browser's IndexedDB.

The only thing that ever leaves your machine is a single AI call — and only when you explicitly press *Generate* on the morning brief or ask a question on `/ask`. Even then, the AI proxy never persists anything; it just forwards your prompt to Claude and streams the answer back.

### One screen tour

| Route | What it's for |
| --- | --- |
| `/today` | Morning brief, journal entry, what-to-do-now nudge, quick stats |
| `/inbox` | Triage everything you've captured |
| `/notes` | Free-form notes, pinned ones float to the top |
| `/tasks` | What needs doing, with priorities, due dates, recurrence, kanban or list view |
| `/habits` | Daily / weekly check-ins, 30-day heatmap, streaks |
| `/decisions` | Log a decision with reasoning, set a review date, mark the outcome later |
| `/highlights` | Lines worth re-reading, surfaced again after a week |
| `/journal` | Past journal entries, sorted by date |
| `/goals` | Targets with progress bars and milestones |
| `/projects` | PARA-style projects and areas |
| `/people` | Conversations, last-contacted, what was discussed |
| `/calendar` | Monthly grid showing captures, due dates, review dates |
| `/timeline` | Everything you've captured, grouped by day |
| `/graph` | Items clustered by topic + wiki-link connections |
| `/tags` | Topics across your captures, weighted by frequency |
| `/reviews` | Weekly review — 3 prompts, auto-saves |
| `/ask` | Chat with everything you've saved (uses Claude) |
| `/stats` | How your second brain is filling up |
| `/settings` | Theme, density, AI key, export, erase |

Press `c` anywhere to open quick-capture. Press `⌘K` / `Ctrl+K` to search.

---

## Architecture in one paragraph

The app is a static Next.js 16 site (App Router, React 19, Turbopack). Every page is a client component that reads from **IndexedDB** via [Dexie](https://dexie.org)'s `useLiveQuery` — so when you capture an item, every open view re-renders without a refresh. There is no server-side database, no auth, no session, no `userId`. Two tiny serverless functions (`/api/ai/brief` and `/api/ai/ask`) act as thin proxies to Claude; they hold no data and never look at IndexedDB. Photos are stored as `Blob` objects in IndexedDB alongside the items that reference them.

---

## Quick start (local)

You need [Node.js 20+](https://nodejs.org).

```bash
git clone https://github.com/ClaudevGuy/life-os.git
cd life-os
npm install
npm run dev
```

Open <http://localhost:3000>. The first page load creates an empty IndexedDB inside your browser. Start capturing.

To wire up the AI features, go to `/settings → AI` and paste an [Anthropic API key](https://console.anthropic.com/settings/keys). The key is stored in localStorage and sent as a `Bearer` header on `/api/ai/*` calls — it never reaches the server's env or any other service.

### Optional: server-wide default AI key

If you'd rather configure the AI key once for the whole deployment (and let every visitor share its quota), copy `.env.example → .env.local` and fill in `AI_GATEWAY_API_KEY`. The proxy uses the Authorization header when present, falling back to this env var otherwise.

```bash
cp .env.example .env.local
# edit .env.local
```

---

## Production deploy

The whole app is essentially a static site with two serverless functions. **Vercel** is the path of least resistance:

```bash
npx vercel
```

That's it. No database to set up, no migrations to run, no DNS records to verify. The only optional env var is `AI_GATEWAY_API_KEY` (or `LIFEOS_TEXT_MODEL` if you want to swap the model — default is `anthropic/claude-haiku-4.5`).

If you'd rather **self-host**, anything that can serve a Next.js standalone build works (Fly, Railway, your own box). The data still lives in each visitor's browser — the server is stateless.

---

## How the data layer works

### Items

Every captured object — note, task, journal entry, habit, decision, highlight, goal, person, project, area — is stored as a single polymorphic record in the `items` table:

```ts
type StoredItem = {
  id: string;
  kind: "note" | "task" | "decision" | ... ;
  title: string | null;
  body: string | null;
  sourceUrl: string | null;
  capturedAt: Date;
  status: "inbox" | "active" | "archived" | "reference";
  isPinned: boolean;
  metadata: Record<string, unknown>;  // kind-specific extras
  // ...summary, keyPoints, topic, photos, etc.
};
```

Kind-specific fields (priority, dueDate, checkins, reviewAt, outcome, etc.) all live under `metadata`. This keeps the schema flat and lets new kinds be added without a migration.

### Reading data

Components subscribe via React hooks defined in [src/lib/store/items.ts](src/lib/store/items.ts):

```ts
const tasks = useItemsOfKind("task");       // reactive
const inbox = useInboxItems();              // reactive
const oneItem = useItem(id);                // reactive
const recent = useRecentItems(24);          // last 24h
const todayJournal = useJournalToday();
const dueDecisions = useDecisionsDue();
```

`useLiveQuery` automatically re-runs whenever the underlying IndexedDB changes — capture an item in one tab, every other tab updates instantly.

### Writing data

```ts
import { captureItem, updateItem, deleteItem } from "@/lib/store/items";

await captureItem({ kind: "note", title: "Foo", body: "Bar" });
await updateItem(id, { isPinned: true });
await deleteItem(id);
```

### Photos

Image uploads are stored as `Blob`s in IndexedDB (max 8 MB, JPEG/PNG/WebP/GIF):

```ts
import { saveBlob, deleteBlob } from "@/lib/store/blobs";
import { BlobImg } from "@/components/blob-img";

const { id } = await saveBlob(file);   // id is what you store in item.metadata.photos
<BlobImg id={id} className="..." />    // renders via URL.createObjectURL, auto-revokes
```

---

## AI features

Two routes live on the server purely as proxies — they never touch your data:

- **`POST /api/ai/brief`** — the browser sends recent items, the proxy forwards to Claude, returns the brief.
- **`POST /api/ai/ask`** — the browser sends a question + a handful of relevant items (selected by keyword match against IndexedDB), the proxy streams Claude's answer back.

Key resolution order:

1. `Authorization: Bearer <key>` header sent by the browser (BYO key from `/settings`)
2. `AI_GATEWAY_API_KEY` env var (server-wide default)
3. Vercel's auto-injected `VERCEL_OIDC_TOKEN` (only on Vercel, only if AI Gateway is enabled)

If none of those is available, AI routes return `503 ai_unavailable` and the UI shows a friendly fallback.

---

## Backup and portability

- **Export** — `/settings → Data → Export everything` dumps every item + photo metadata as one JSON file. Save it wherever you back up the rest of your life.
- **Erase** — `/settings → Data → Erase everything` clears IndexedDB and starts you fresh.
- **Switch browsers / devices** — your data does *not* follow you. This is a deliberate trade-off in favour of "my data lives on my machine." See *Roadmap* for the planned Gist-sync option.

> ⚠️ Clearing browser data wipes Life OS too. If that matters to you, export periodically.

---

## Project layout

```text
src/
  app/
    (app)/                     all UI routes share a sidebar layout
      today/                   morning hub
      inbox/                   triage queue
      tasks/ habits/ ...       per-kind list pages
      items/[id]/              shared detail view
      ...
      settings/                preferences · AI key · export · erase
    api/
      ai/brief/                Claude proxy: morning brief
      ai/ask/                  Claude proxy: streaming chat
  components/                  shared UI (TopBar, SidebarNav, QuickCapture, ...)
  lib/
    store/
      db.ts                    Dexie schema (items + blobs)
      items.ts                 CRUD + reactive hooks
      blobs.ts                 photo storage
    ai-key.ts                  localStorage helper for the BYO AI key
    ai-provider.ts             server-side: resolve which provider/key to use
    natural-date.ts            "friday", "tomorrow", "in 3 days" parsing
    ...
```

---

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Dexie 4** for IndexedDB
- **Vercel AI SDK** + `@ai-sdk/anthropic` for Claude calls
- **Tailwind v4** for styling
- **cmdk** for the ⌘K palette
- **sonner** for toasts
- **lucide-react** for icons

That's the whole runtime. No database, no auth provider, no email service, no ORM.

---

## Roadmap

Things deliberately deferred:

- **Gist sync** — optional opt-in: write a JSON snapshot to a private GitHub Gist on a schedule; pull it down on a new device. Same pattern as [Hangar](https://github.com/ClaudevGuy/hangar)'s `gistSync.ts`.
- **iOS Shortcut capture** — POST to a tiny `/api/capture` endpoint that pushes into your gist; browser picks it up on next visit.
- **Semantic search** — currently keyword `.includes()` over IndexedDB. Good enough for personal scale; if needed, swap in [FlexSearch](https://github.com/nextapps-de/flexsearch) or in-browser embeddings via `transformers.js`.
- **Browser extension** — capture-from-anywhere via the same gist relay.

---

## License

No license file yet — treat this as personal-use only unless that changes.

---

## Acknowledgements

The architecture is a direct riff on [Hangar](https://github.com/ClaudevGuy/hangar), which proved this pattern works. The category-tinted UI vocabulary (the gold accent, the warm-paper light mode, the per-card top accents) is original to Life OS.
