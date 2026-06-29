# Life OS

> The operating system for your whole life — tasks, habits, notes, a whiteboard, goals, money, people, messages, knowledge, an encrypted vault, and an AI that actually does things — in one app. **Local-first**: every byte lives in your browser, never on someone else's server.

[![Live Demo](https://img.shields.io/badge/live%20demo-Vercel-000?logo=vercel)](https://life-os-tan-tau.vercel.app/) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-149eca) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![IndexedDB](https://img.shields.io/badge/storage-IndexedDB-f0a868)

**🌐 Landing page:** <!-- LANDING_URL -->[**life-os-tan-tau.vercel.app**](https://life-os-tan-tau.vercel.app/)<!-- /LANDING_URL --> — a marketing site, deployed from [`marketing/`](marketing/). The app itself is **never deployed**; it stays local-first on your machine.

---

## What this is

Life OS is a personal "second brain" built around one idea: **your data should belong to you, fully.** No signup, no database to provision, no SaaS subscription. You open the app and start capturing. Everything — notes, a whiteboard, tasks, habits, goals, finances, people, files, your messages, and an encrypted secrets vault — lives inside your browser's **IndexedDB**.

The only things that ever leave your machine are explicit, read-only lookups: an AI call when you use *Ask* or voice, your own connected mailbox for *Messages*, and anonymous market/FX/wallet/favicon requests on the Finance and Subscriptions pages. None of it persists server-side, and your actual data never goes anywhere — notifications and backups are entirely local.

### The pages

| Area | Route | What it's for |
| --- | --- | --- |
| **Capture** | `/inbox` | Triage queue for everything you capture |
| | `/messages` | Unified inbox — your **Gmail** threads in a two-pane reader |
| | `/notes` | A card-wall of every note: markdown, `[[wiki-link]]` autocomplete, paste-to-attach images, backlinks |
| | `/whiteboard` | A single infinite **Excalidraw** canvas — sketch, diagram, sticky-notes; autosaves locally and follows your theme |
| | `/bookmarks` | Reading list / saved links |
| | `/files` | PDFs, docs, images — stored locally |
| **Daily** | `/today` | Customizable drag-and-drop dashboard: time-of-day hero, week pulse, agenda, habits, music, markets, and more |
| | `/calendar` | Month / week / agenda over every dated item, plus a per-day notes scratchpad |
| | `/tasks` | Quick-add with priorities, board/list views, due dates & reminders |
| | `/habits` | Streaks, a GitHub-style heatmap, cadence-aware (daily/weekdays/weekly) |
| **Reflect** | `/goals` | Identity-first goals with auto-rolling progress (slider / number / milestones) |
| | `/projects` | Projects with GitHub links, KPIs, milestones, and linked tasks |
| | `/people` | Lightweight CRM with a backlinks-driven conversation timeline |
| | `/finance` | Net worth across accounts + live-valued crypto/stock holdings (incl. on-chain wallet balances), allocation donut, multi-currency FX, a trend, and a USD (DXY / pairs) chart |
| | `/subscriptions` | Recurring spend with service logos, a donut breakdown, upcoming renewals, cycle progress, and pause/cancel |
| **Explore** | `/ask` | Agentic AI over your notes — answers *and* takes actions (add reminders, holdings, people…) |
| | `/music` | Your YouTube Music, with a persistent mini-player |
| | `/vault` | Encrypted (AES-GCM) store for passwords, cards, codes — behind a passcode, with an optional whole-app lock |
| **More** | `/highlights` `/reviews` `/tags` `/settings` | Resurfacing highlights, weekly review, tag cloud, preferences |

Press `c` to quick-capture · `⌘K` / `Ctrl+K` to search · the **mic** in the top bar for voice capture · the **timer** for focus sessions · the **theme toggle** cycles light → cloudy → dark.

---

## Architecture in one paragraph

A Next.js 16 app (App Router, React 19, Turbopack). Every page is a client component reading from **IndexedDB** via [Dexie](https://dexie.org)'s `useLiveQuery` — capture an item in one tab and every open view re-renders instantly. There is no server database, no auth, no session. A few thin serverless routes act as read-only proxies — AI (`/api/ai/*`), voice transcription (`/api/voice/transcribe`), live markets (`/api/markets/*`), on-chain wallet balances (`/api/wallet/*`), and YouTube OAuth (`/api/youtube/*`) — and none of them touch your IndexedDB. The Messages inbox talks to your own connected Gmail account and caches threads locally. Photos are `Blob`s stored alongside the items that reference them. The encrypted vault is its own table and is **never synced**.

---

## Quick start (local)

You need [Node.js 20+](https://nodejs.org).

```bash
git clone https://github.com/ClaudevGuy/life-os.git
cd life-os
npm install
npm run dev
```

Open <http://localhost:3000>. The first load creates an empty IndexedDB in your browser. Start capturing.

To enable the AI features, go to `/settings → AI credentials`, pick a provider (Anthropic or OpenAI), and paste your key. It's stored in localStorage and sent as `Authorization: Bearer <key>` + `X-AI-Provider` + optional `X-AI-Model` on `/api/ai/*` calls — it never reaches the server's env or any other service.

### Optional integrations

- **YouTube Music** (`/music`) — needs your own free Google Cloud OAuth credentials in `.env.local` (`YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`). The `/music` page walks you through the one-time setup.
- **Gmail** (`/messages`) — connect your own Google account to read your inbox; threads and messages are cached locally and never leave your machine beyond the Gmail API itself.
- **Server-wide default AI key** — copy `.env.example → .env.local` and set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for the fallback path.

---

## How the data layer works

### Items

Most captured objects are a single polymorphic record in the `items` table, discriminated by `kind`:

```ts
type StoredItem = {
  id: string;
  kind: "note" | "task" | "habit" | "highlight" | "person" | "project"
      | "area" | "file" | "voice" | "bookmark" | "subscription"
      | "goal" | "account" | "holding" | "decision" | "journal";
  title: string | null;
  body: string | null;          // markdown; [[wiki links]] connect items
  status: "inbox" | "active" | "archived" | "reference";
  capturedAt: Date;
  isPinned: boolean;
  metadata: Record<string, unknown>;   // kind-specific extras
  // ...summary, keyPoints, topic, etc.
};
```

Kind-specific fields live under `metadata` — e.g. **task** (`priority`, `dueDate`, `completedAt`, `reminder`, `projectId`), **habit** (`cadence`, `checkins[]`), **goal** (`timeframe`, `metric`, `milestones[]`, `identity`), **subscription** (`amount`, `currency`, `cycle`, `nextChargeAt`, `website`, `paused`), **account** (`accountType`, `category`, `balance`, `currency`), **holding** (`assetClass`, `symbol`, `coinId`, `quantity`, `costBasis`). Reminders are tasks with `metadata.reminder = true` + a `dueDate`. This flat shape lets new kinds/fields land without a schema migration. (The whiteboard and your messages are *not* items — they each get their own table; see below.)

### Other tables (Dexie v12)

| Table | Purpose | Synced? |
| --- | --- | --- |
| `items` | the polymorphic store above | yes (opt-in Gist) |
| `blobs` | photo/file `Blob`s | — |
| `trash` + `tombstones` | soft-delete & restore | — |
| `dayNotes` | per-calendar-day scratchpad | — |
| `netWorthSnapshots` | daily net-worth points for the Finance trend | — |
| `whiteboard` | the single infinite-canvas scene | local (in JSON backup) |
| `msgAccounts` · `msgThreads` · `msgMessages` | connected mailboxes + cached threads/messages | — (local; volume + credentials) |
| `appKV` | small app settings (e.g. the connected backup folder handle) | — |
| `vault` | **AES-GCM encrypted** secrets (PBKDF2-derived key) | **never** |

### Reading / writing

```ts
import { useItemsOfKind, captureItem, updateItem, deleteItem } from "@/lib/store/items";

const tasks = useItemsOfKind("task");          // reactive via useLiveQuery
await captureItem({ kind: "note", title: "Foo", body: "Bar" });
await updateItem(id, { isPinned: true });
await deleteItem(id);                           // soft-delete → trash
```

---

## AI features

The AI is **agentic** and brings your own key — it talks to providers directly (no gateway).

- **`POST /api/ai/ask`** — the browser sends a question + relevant items; the model streams an answer *and* can call tools the browser then executes locally: `addReminder`, `addTask`, `addPerson`, `addNote`, `addBookmark`, `addAccount`, `addHolding`. So "remind me to call Henry tomorrow at 2" or "add 0.5 BTC to my holdings" just works.
- **`POST /api/ai/command`** — the natural-language command router behind **voice capture** and quick actions (create things, switch theme, start a focus timer…); paired with **`POST /api/voice/transcribe`** for speech-to-text.
- **`POST /api/ai/brief`** — a generated summary of recent activity (the *Brief* card on the Today dashboard).

| Provider | Direct via | Default model |
| --- | --- | --- |
| Anthropic | `@ai-sdk/anthropic` | `claude-haiku-4-5` |
| OpenAI | `@ai-sdk/openai` | `gpt-4o-mini` |

> Note: Anthropic model ids use **dashes** in the version (`claude-haiku-4-5`), not dots. Server dispatch in [`src/lib/ai-provider.ts`](src/lib/ai-provider.ts) normalizes a dotted id for back-compat. If no key is reachable the route returns `503 ai_unavailable` and the UI shows a friendly fallback.

### Live data (read-only proxies)

- **`/api/markets/*`** proxies public price data so it never hits the browser's CORS or needs a key: **crypto** (CoinGecko), **stocks** + **USD/DXY/FX pairs** (Yahoo), and FX rates (frankfurter.app) for true multi-currency net worth.
- **`/api/wallet/{evm,solana}`** reads on-chain balances for a wallet address you add, so holdings can value themselves live.

All cached server-side; nothing personal is sent.

---

## Backup & portability

- **Full snapshot** — `/settings → Backups`: download a complete backup (every table **including the encrypted vault and your whiteboard**) as one JSON, or restore one back in — dates revived, items merged.
- **Connect a folder** — grant a local folder via the [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_Access_API) and Life OS writes a fresh backup there **automatically** (~every 12h while the app is open), with a "last backed up" indicator. Disconnect anytime.
- **Export / Import** — `/settings → Data` for a quick items + day-notes JSON.
- **Trash** — deletes are recoverable; auto-purged after 30 days.
- **Optional Gist sync** — opt in to mirror your items to a private GitHub Gist so a second device can pull them down. The encrypted vault and your cached messages are **excluded** by design.

> ⚠️ Everything lives in IndexedDB, which a browser *can* evict under storage pressure. Connect a backup folder (or export periodically) if it matters.

---

## Notifications & install (PWA)

Life OS installs as a [PWA](https://developer.mozilla.org/docs/Web/Progressive_web_apps) — add it to your home screen or dock for a standalone, offline-capable app. A service worker caches the shell so it opens without a network.

- **Local notifications** — `/settings → Notifications`: get nudged when a reminder comes due, a subscription renews, it's someone's birthday, or you still have habits to check off. An in-app scheduler fires them while the app is open — **no push server, nothing leaves your machine** — and clicking one focuses the app on the right page.
- **Shortcuts** — long-press the installed icon for jumps to Today and Ask.
- **Share target** — on mobile, share a link or text from any app straight into Life OS; it lands as a bookmark (if it's a URL) or a note.

---

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Dexie 4** for IndexedDB
- **AI SDK** + `@ai-sdk/anthropic` + `@ai-sdk/openai` (direct, no gateway) · **zod** for tool schemas
- **@excalidraw/excalidraw** for the infinite whiteboard
- **@dnd-kit** for the drag-and-drop Today dashboard
- **Tailwind v4** · **cmdk** (⌘K) · **sonner** (toasts) · **lucide-react** (icons)
- **Web Crypto** (vault) · **Web Speech API** (voice) · **Service Worker + Notifications + File System Access** (PWA, nudges, folder backups) · Gmail API (messages) · YouTube IFrame + Data API (music)

No database, no auth provider, no ORM, no backend of your own.

---

## Project layout

```text
src/
  app/
    (app)/            all app routes share the sidebar layout
      today/ inbox/ messages/ notes/ whiteboard/ tasks/ habits/ goals/
      finance/ subscriptions/ projects/ people/ calendar/ music/ vault/
      ask/ bookmarks/ files/ share/ highlights/ reviews/ tags/ settings/
      items/[id]/     shared detail view (dispatches by kind)
    api/
      ai/{ask,command,brief}/                agentic AI + voice command proxies
      voice/transcribe/                      speech-to-text proxy
      markets/{crypto,stocks,fx,quote,usd}/  live price proxies
      wallet/{evm,solana}/                   on-chain balance lookups
      youtube/...                            OAuth + Data API for Music
  components/         top-bar, sidebar, command palette, quick/voice capture,
                     whiteboard/, pwa-bootstrap, vault/, music-player…
  lib/
    store/            db.ts (Dexie) · items.ts · blobs.ts · whiteboard.ts ·
                     messaging.ts · snapshots.ts · day-notes.ts · wallets.ts
    messaging/        Gmail client + credentials      sync/  gist.ts
    ai-provider.ts ask.ts notify.ts backup.ts finance.ts goals.ts links.ts voice/ vault/…
  public/            manifest.webmanifest · sw.js (service worker)
marketing/            standalone landing site (deployable to Vercel)
```

---

## Design

Three modes via the top-bar toggle — **light**, **cloudy** (a soft, cool frosted-glass / glassmorphism mirror mode), and **dark**. The **Studio** visual direction — warm-paper surfaces (`#F6F1E8` cream / near-black in dark), a terra (`#D45A3F`) accent, sage/gold/plum/sky tints, 12px cards. Type is **Geist** / **Geist Mono**. Tokens live in [`src/app/globals.css`](src/app/globals.css); legacy names alias onto the Studio palette.

---

## License

No license file yet — treat this as personal-use only unless that changes.
