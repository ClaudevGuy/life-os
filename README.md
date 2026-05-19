# Life OS

Capture, organize, and recall everything you care about — bookmarks, notes, decisions, people, daily journals — in one polymorphic store, with an open API so Claude Code and other tools can plug in.

## Stack

- Next.js 16 (App Router, Turbopack, React 19)
- Postgres (Neon serverless) + Drizzle ORM + pgvector
- Auth.js v5 — magic-link email via Resend
- Vercel AI SDK + AI Gateway (Anthropic + OpenAI by default)
- Tailwind v4 + cmdk command palette + Sonner

## Setup

### 1. Environment

```powershell
cp .env.example .env.local
```

Fill in:

- `DATABASE_URL` — Neon Postgres URL (see [Vercel Marketplace](https://vercel.com/marketplace) or [neon.tech](https://neon.tech))
- `AUTH_SECRET` — `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- `AUTH_RESEND_KEY` + `EMAIL_FROM` — for magic-link sign-in
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway key (or skip and let `vercel env pull` provision OIDC)

### 2. Database

```powershell
npm install
npm run db:setup       # enables pgvector extension
npm run db:push        # creates tables from schema
```

### 3. Run

```powershell
$env:ComSpec='C:\Windows\System32\cmd.exe'; $env:SHELL='C:\Windows\System32\cmd.exe'
npm run dev
```

Open <http://localhost:3000>, sign in via magic link, then go to **Settings → API Keys** to mint a bearer token.

## Capture from anywhere

Once you have a key:

```bash
curl -X POST http://localhost:3000/api/v1/capture \
  -H "Authorization: Bearer lifeos_..." \
  -H "Content-Type: application/json" \
  -d '{"kind":"bookmark","sourceUrl":"https://useworkflow.dev"}'
```

See [`docs/api.md`](./docs/api.md) for the full API contract.

## What's here (1-week MVP)

| Slice | Path | Status |
| --- | --- | --- |
| Capture API | `/api/v1/capture` | Bearer auth, dedupe by URL |
| Inbox | `/inbox` | All captures awaiting triage |
| Today | `/today` | Brief, journal, quick decision |
| People | `/people` | Add + list, conversations link via connections |
| Decisions | `/decisions` | List with review-due flagging |
| Timeline | `/timeline` | Grouped by day |
| Graph | `/graph` | Clustered by topic (force-directed in phase 2) |
| Search | ⌘K | Hybrid pgvector + ILIKE |
| API Keys | `/settings/keys` | Mint, revoke, last-used tracking |

## What's next (phase 2)

See the plan at `~/.claude/plans/i-d-like-to-build-calm-hollerith.md`:

1. MCP server wrapping the REST API
2. Browser extension
3. Cron-driven daily brief + email
4. Smart resurfacing v2 (the `pickResurfaceCandidates` helper is already in [`src/lib/resurface.ts`](./src/lib/resurface.ts))
5. Agent fleet (Workflow DevKit)
6. Voice capture via iOS Shortcut
7. Context bundles (markdown export for AI tools)
8. Design pass — pick between dark+gold and Linear-minimal
9. Mobile PWA
10. Habit/energy analytics
