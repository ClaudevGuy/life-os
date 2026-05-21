# Life OS

> Capture, organize, and recall everything you care about — notes, tasks, projects, people, daily journals — in one place. **Local-first**: every byte lives in your browser, never on someone else's server.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-149eca) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![IndexedDB](https://img.shields.io/badge/storage-IndexedDB-f0a868)

---

## What this is

Life OS is a personal knowledge manager built around a single idea: **your second brain should belong to you, fully**. There is no signup, no database to provision, no SaaS subscription. You open the app, you start capturing. Your items, journals, photos, and habits live inside your browser's IndexedDB.

The only thing that ever leaves your machine is a single AI call — and only when you explicitly press *Generate* on the morning brief or ask a question on `/ask`. Even then, the AI proxy never persists anything; it just forwards your prompt to Claude and streams the answer back.

### One screen tour

| Route | What it's for |
| --- | --- |
| `/today` | Morning brief, inline journal entry, what-to-do-now nudge, next-7-days agenda, upcoming subscription renewals |
| `/inbox` | Triage what you've captured — swipe rows to archive (terra) or file (sage), or use the buttons |
| `/notes` | Master-detail two-pane editor with a grid-view toggle. Inline edit + paste-to-attach images |
| `/files` | PDFs, Word, text, slides — uploaded and stored locally |
| `/tasks` | Quick-add bar with priority pills + Board / List views. Stat tiles for Open / Overdue / Due today / Done this week |
| `/habits` | Single table — dot + name (click to open calendar history), cadence-aware streak, 7 clickable weekday cells, 30-day sparkline. The history modal has a month-stepping calendar with click-to-backfill |
| `/highlights` | Lines worth re-reading, surfaced again after a week |
| `/journal` | Inline write-today editor (5-circle energy scale, rotating prompts, autosave) with past entries listed alongside |
| `/projects` | Stats row + projects grouped under their area. Project detail has a Studio hero, KPI grid, real task-pip bar (uses `metadata.projectId`), inline tasks list, milestones, photos, linked items |
| `/people` | "Needs a reply" (no contact / >14d stale) + "Everyone" grid. Person detail with color-band hero, next-step row, Notes + Threads timeline (backlinks-driven), Quick facts, Reach out (mailto:/tel:) |
| `/subscriptions` | Recurring charges with monthly + annual totals, "renewing this week" stat, category breakdown bar, and a transaction-style list with monogram tiles, monthly-equivalent cost, and next-charge proximity |
| `/calendar` | Month / week / agenda views of reminders; archived reminders render struck-through |
| `/tags` | Topics across your captures, weighted by frequency |
| `/reviews` | Weekly review — 3 prompts, auto-saves |
| `/ask` | Chat with everything you've saved (Anthropic or OpenAI, your key) |
| `/stats` | How your second brain is filling up |
| `/settings` | Theme, density, AI credentials, export, erase |

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

To wire up the AI features, go to `/settings → AI credentials`, pick a provider (Anthropic or OpenAI), and paste your key. Optionally set a model override. The key is stored in localStorage and sent as `Authorization: Bearer <key>` + `X-AI-Provider` + optional `X-AI-Model` headers on `/api/ai/*` calls — it never reaches the server's env or any other service.

### Optional: server-wide default key

If you'd rather configure a key once instead of pasting in the UI, copy `.env.example → .env.local` and set either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (matching whichever provider you want for the fallback path). The proxy uses the browser's Authorization header when present, falling back to whichever env var matches `LIFEOS_TEXT_MODEL`'s prefix.

```bash
cp .env.example .env.local
# edit .env.local
```

---

## Running it somewhere other than localhost

The whole app is a static Next.js site with two tiny API routes. Any host that runs a Next standalone build will serve it — your own box, a small VPS, Fly, Railway, whatever. **No database to provision, no auth to wire, no DNS dance.** The data still lives in each visitor's browser.

If you expose the AI proxy publicly with `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` set, anyone who finds the URL can spend your quota. Add rate limiting or require the BYO Authorization header before opening it up. The code comments in `/api/ai/brief/route.ts` say the same thing.

---

## How the data layer works

### Items

Every captured object — note, task, journal entry, habit, highlight, person, project, area, file, voice — is stored as a single polymorphic record in the `items` table:

```ts
type StoredItem = {
  id: string;
  kind: "note" | "task" | "habit" | "journal" | "highlight"
      | "person" | "project" | "area" | "file" | "voice"
      | "goal" | "decision";   // legacy — no list page, items still viewable
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

Kind-specific fields all live under `metadata`. Some shapes the UI reads today:

- **task** — `priority`, `dueDate`, `completedAt`, `recurrence`, `reminder`, `projectId` (links task to a project)
- **habit** — `cadence: "daily" | "weekdays" | "weekly"`, `checkins: string[]` (local ymd dates). Cadence-aware streaks live in [`src/lib/habits.ts`](src/lib/habits.ts) — weekly habits count consecutive *weeks* with ≥1 check-in, weekday habits skip Sat/Sun without breaking
- **journal** — `energy: 1..5`, `mood`, `photos: string[]`
- **project** — `area: string`, `progress: 0..100`, `targetDate`, `status: "active" | "shipping" | "paused"`, `milestones: { title, date?, done? }[]`
- **person** — `relationship`, `role`, `location`, `color`, `email`, `phone`, `birthday`, `metAt`, `lastContactedAt`, `nextStep: { title, dueDate? }`
- **subscription** — `amount: number`, `currency: string` (USD/EUR/GBP/ILS/JPY/CHF/CAD/AUD), `cycle: "weekly" | "monthly" | "quarterly" | "yearly"`, `nextChargeAt?: iso`, `category?`, `cancelUrl?`. Helpers in [`src/lib/subscriptions.ts`](src/lib/subscriptions.ts)

This flat shape lets new kinds and fields be added without a schema migration.

> Note: the schema still includes `goal` and `decision` kinds for back-compat with old data — their list pages were removed earlier. The `subscription` kind is the newest addition.

### Reading data

Components subscribe via React hooks defined in [src/lib/store/items.ts](src/lib/store/items.ts):

```ts
const tasks = useItemsOfKind("task");       // reactive
const inbox = useInboxItems();              // reactive
const oneItem = useItem(id);                // reactive
const recent = useRecentItems(24);          // last 24h
const todayJournal = useJournalToday();
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

Two routes live on the server purely as proxies — they never touch your data, never persist anything:

- **`POST /api/ai/brief`** — the browser sends recent items, the proxy forwards them to the chosen provider, returns the brief.
- **`POST /api/ai/ask`** — the browser sends a question + a handful of relevant items (selected by keyword match against IndexedDB), the proxy streams the answer back.

**Multi-provider, BYO key.** No Vercel AI Gateway in the path — the app talks to providers directly so you don't have to sign up for an intermediary.

| Provider | Direct via | UI default model |
|---|---|---|
| Anthropic | `@ai-sdk/anthropic` | `claude-haiku-4.5` |
| OpenAI | `@ai-sdk/openai` | `gpt-4o-mini` |

Per-request the browser sends three headers when a key is configured:

```http
Authorization:  Bearer <key>
X-AI-Provider:  anthropic | openai
X-AI-Model:     <optional model override>
```

Server-side dispatch lives in [`src/lib/ai-provider.ts`](src/lib/ai-provider.ts). Adding a third provider is ~15 lines — `npm i @ai-sdk/<provider>`, add a literal to the `AiProvider` union, add a `case` in `buildModel`, add a meta entry in the settings UI.

If no Authorization header is present, the route falls back to env vars based on the model prefix:
- `openai/...` in `LIFEOS_TEXT_MODEL` → reads `OPENAI_API_KEY`
- anything else → reads `ANTHROPIC_API_KEY`

If neither header nor env var is reachable, the route returns `503 ai_unavailable` and the UI shows a friendly fallback.

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
      notes/ tasks/ habits/ …  per-kind list pages
      subscriptions/           recurring charges + monthly totals
      items/[id]/              shared detail view (dispatches to kind-specific layouts)
      projects/project-detail  Studio layout for kind="project"
      people/person-detail     Studio layout for kind="person"
      ...
      settings/                preferences · AI credentials · export · erase
    api/
      ai/brief/                provider proxy: morning brief
      ai/ask/                  provider proxy: streaming chat
    icon.svg / apple-icon.tsx  app icons (Next 16 file conventions)
    error.tsx / not-found.tsx  Studio-styled error + 404 surfaces
    global-error.tsx           catches root-layout failures
  components/
    portal.tsx                 createPortal wrapper so modals escape any
                               containing-block-creating ancestor
    sidebar-nav.tsx
    top-bar.tsx
    command-palette.tsx        ⌘K palette
    quick-capture.tsx          floating "+" FAB and `c`-key composer
    ...
  lib/
    store/
      db.ts                    Dexie schema (items + blobs)
      items.ts                 CRUD + reactive hooks
      blobs.ts                 photo storage
    ai-key.ts                  localStorage helper for BYO credentials (provider + key + model)
    ai-provider.ts             server-side dispatch — Anthropic or OpenAI direct
    habits.ts                  cadence-aware streak / pending / this-week helpers
    subscriptions.ts           cycle conversion, monthly totals per currency, formatters
    ymd.ts                     local-timezone "YYYY-MM-DD" (never UTC — fixes off-by-one on east-of-UTC clocks)
    natural-date.ts            "friday", "tomorrow", "in 3 days" parsing
    ...
```

**Kind-specific detail pages.** `/items/[id]` is the canonical detail route, but it switches on `item.kind`:

- `project` → renders [`ProjectDetail`](src/app/(app)/projects/project-detail.tsx) (hero with monogram + KPIs, real task-pip bar from `metadata.projectId`-linked tasks, inline tasks list, milestones)
- `person` → renders [`PersonDetail`](src/app/(app)/people/person-detail.tsx) (color-band hero, next-step row, Threads timeline, Quick facts, Reach out)
- `habit` → redirects to `/habits` (no detail page; the habit row itself opens an edit-and-history modal with a click-to-toggle calendar)
- everything else → the generic detail view (title, body, photos, backlinks, kind-specific editors for journal energy)

Subscriptions don't use `/items/[id]` at all — they're created, viewed, edited, and deleted directly on `/subscriptions` via the modal.

---

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Dexie 4** for IndexedDB
- **AI SDK** + `@ai-sdk/anthropic` + `@ai-sdk/openai` (direct providers, no gateway)
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

## Design

Life OS uses the **Studio** visual direction — warm-paper surfaces (`#F6F1E8` cream in light, near-black in dark), a terra (`#D45A3F`) primary accent, sage / gold / plum / sky as category tints, 12px card corners, and 10px rounded-rect controls. Typography is **Geist** / **Geist Mono**. Tokens live in [src/app/globals.css](src/app/globals.css); legacy token names alias onto the Studio palette so older components retint automatically.

---

## Acknowledgements

The architecture is a direct riff on [Hangar](https://github.com/ClaudevGuy/hangar), which proved the local-first-with-Dexie pattern works. The Studio visual direction — warm paper, terra accent, sans typography — is its own thing.
