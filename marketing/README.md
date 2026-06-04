# Life OS — landing site

A standalone, static marketing page for Life OS. It's completely decoupled
from the app: the app stays local-first on your machine, and **only this folder
gets deployed**. CTAs point to the GitHub repo.

## Develop

```bash
cd marketing
npm install
npm run dev            # http://localhost:3000
```

## Build (static)

```bash
npm run build          # outputs static HTML to ./out
```

It uses `output: "export"`, so `out/` is plain static files — host them on
Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3, anywhere.

## Deploy to Vercel (recommended)

This site lives in a subfolder of the main repo, so point Vercel at it:

**Dashboard**
1. Import `github.com/ClaudevGuy/life-os` as a new Vercel project.
2. Set **Root Directory** to `marketing`.
3. Framework preset: **Next.js**. Build command and output are auto-detected.
4. Deploy. The app routes (`/today`, etc.) are **not** part of this project,
   so they never go public — only the landing does.

**CLI**
```bash
cd marketing
npx vercel            # preview
npx vercel --prod     # production
```

## Editing

The page is a single component: `app/page.tsx`. Styles are in
`app/globals.css` (scoped under `.lp-root`). Change the GitHub URL via the
`GITHUB` constant at the top of `app/page.tsx`.
