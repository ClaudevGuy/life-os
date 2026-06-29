# Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. No unit-test framework in `marketing/` — verification is `npm run build` + the Claude Preview MCP across all three themes.

**Goal:** Rebuild the `marketing/` landing page on Life OS's real Studio design language with a live light/cloudy/dark theme toggle and current-feature content, via faithful HTML mockups.

**Architecture:** Keep the existing `.lp-*` class names and `marketing/app/page.tsx` section structure, but (1) make the `--lp-*` CSS variables **theme-aware** — three token sets scoped by `html[data-theme]`, ported from the app's Studio palette — (2) add the cloudy aurora + frosted-glass treatment, (3) add a nav theme toggle with no-flash boot, and (4) refresh all content + mockups to the current app.

**Tech Stack:** Next.js (marketing app), React, Geist/Geist Mono, plain CSS (no Tailwind utilities for theming — CSS vars), lucide-react.

## Global Constraints

- `marketing/` stays standalone & Vercel-deployable — NO `@/…` imports from the app; Studio tokens are copied in, not imported.
- Default theme: **light** (warm paper). Theme cycle order: **light → cloudy → dark**. Persist to `localStorage["lifeos.landing.theme"]`.
- Studio token values are copied verbatim from `src/app/globals.css` (light/dark/cloudy).
- Content must match the current app: ADD Messages (Gmail) + Whiteboard (Excalidraw); REMOVE Health, Connections graph, Templates, gym.
- Commits deferred — build, verify in preview, show the user; commit only after visual approval.
- Honor `prefers-reduced-motion` (already handled for `.lp-root *`; keep it for the aurora).

---

### Task 1: Theme-aware token foundation + no-flash boot

**Files:**
- Modify: `marketing/app/globals.css` (token blocks + cloudy aurora/glass)
- Modify: `marketing/app/layout.tsx` (data-theme boot, body bg follows theme)

- [ ] **Step 1: Replace the single `.lp-root` token block** with three theme-scoped sets. Keep all existing `--lp-*` names so downstream classes/JSX keep working; only the values change per theme. Use the app's Studio values:

```css
/* Light (default) — Studio paper */
:root, html[data-theme="light"] {
  --lp-bg: #F6F1E8; --lp-bg2: #EFE7D7; --lp-paper: #FBF7EE; --lp-paper2: #F2EBDA;
  --lp-ink: #1A1A1A; --lp-muted: #8A7F6B; --lp-faint: #B5A98F;
  --lp-line: rgba(26,26,26,0.08); --lp-line-2: rgba(26,26,26,0.14);
  --lp-terra: #D45A3F; --lp-gold: #C8995A; --lp-violet: #6B4E5C; --lp-sky: #6B89A8; --lp-sage: #7A8B6F;
  --lp-card: var(--lp-paper);
  --lp-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 6px 22px -10px rgba(26,26,26,0.18);
}
html[data-theme="dark"] {
  --lp-bg: #1A1612; --lp-bg2: #221C16; --lp-paper: #221D17; --lp-paper2: #1E1A14;
  --lp-ink: #F2EADB; --lp-muted: #A7977C; --lp-faint: #73685A;
  --lp-line: rgba(242,234,219,0.08); --lp-line-2: rgba(242,234,219,0.14);
  --lp-terra: #E7775D; --lp-gold: #E4B871; --lp-violet: #9C7A8A; --lp-sky: #8FB0CE; --lp-sage: #9CB089;
  --lp-card: var(--lp-paper);
  --lp-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 28px -10px rgba(0,0,0,0.55);
}
html[data-theme="cloudy"] {
  --lp-bg: #0B1024; --lp-bg2: rgba(255,255,255,0.08); --lp-paper: #141B38; --lp-paper2: #1C2550;
  --lp-glass: rgba(18,25,54,0.45); --lp-glass-strong: rgba(26,34,70,0.55);
  --lp-ink: #F3F6FF; --lp-muted: #AEB9D8; --lp-faint: #828FB6;
  --lp-line: rgba(255,255,255,0.14); --lp-line-2: rgba(255,255,255,0.26);
  --lp-terra: #6AA6FF; --lp-gold: #FFCE73; --lp-violet: #C79BFF; --lp-sky: #5BC8FF; --lp-sage: #54E6B0;
  --lp-card: var(--lp-glass);
  --lp-shadow: inset 0 1px 0 rgba(255,255,255,0.16), 0 14px 40px -12px rgba(4,8,24,0.6);
}
```

Update `.lp-root` to use `background: var(--lp-bg)` (it already does) and ensure surfaces (`.lp-card`, `.lp-glass`, `.lp-nav`) reference `var(--lp-card)`/`var(--lp-paper)`/`var(--lp-line)` + `box-shadow: var(--lp-shadow)` instead of the old hardcoded translucent whites. Keep `.lp-card` radius and hover.

- [ ] **Step 2: Add the cloudy aurora + glass.** Port the app's aurora onto the landing root, and give cloudy its frosted surface:

```css
html[data-theme="cloudy"] body::before {
  content:""; position:fixed; inset:0; z-index:-1; pointer-events:none;
  background:
    radial-gradient(42% 38% at 16% 20%, rgba(96,150,255,0.55) 0%, transparent 60%),
    radial-gradient(38% 34% at 84% 14%, rgba(80,200,255,0.50) 0%, transparent 60%),
    radial-gradient(48% 44% at 80% 82%, rgba(74,232,178,0.46) 0%, transparent 62%),
    radial-gradient(46% 46% at 18% 88%, rgba(168,120,255,0.50) 0%, transparent 60%),
    linear-gradient(160deg,#0E1640 0%,#0A0F2C 55%,#0C1030 100%);
  animation: cloudy-aurora 28s ease-in-out infinite;
}
@keyframes cloudy-aurora { 0%,100%{transform:translate3d(0,0,0) scale(1.04);} 50%{transform:translate3d(0,-2.5%,0) scale(1.12);} }
html[data-theme="cloudy"] .lp-card, html[data-theme="cloudy"] .lp-glass {
  background: var(--lp-glass); -webkit-backdrop-filter: blur(16px) saturate(150%); backdrop-filter: blur(16px) saturate(150%);
}
@media (prefers-reduced-motion: reduce){ html[data-theme="cloudy"] body::before{ animation:none; } }
```

In light/dark, the existing hero `.lp-grid`/`.lp-floor`/`.lp-blob` ambient stays (tune opacity so it reads on paper); in cloudy the aurora is the ambient.

- [ ] **Step 3: layout.tsx** — make the body theme-driven and add a no-flash boot script. Replace `<body style={{background:"#070710"}}>` with `background: var(--lp-bg)` and inject before paint:

```tsx
<html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
  <head><script dangerouslySetInnerHTML={{ __html:
    `(function(){try{var t=localStorage.getItem('lifeos.landing.theme')||'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`
  }} /></head>
  <body style={{ margin: 0, background: "var(--lp-bg)", color: "var(--lp-ink)" }}>
    <div className="lp-root">{children}</div>
  </body>
</html>
```

- [ ] **Step 4: Verify (build + preview).** `cd marketing && npm run build` passes. In the preview, the page renders in **light** (warm paper). Set `document.documentElement.dataset.theme = 'dark'` / `'cloudy'` via eval → the whole page re-skins; cloudy shows the aurora + frosted cards. Console clean.

---

### Task 2: Live theme toggle in the nav

**Files:**
- Modify: `marketing/app/page.tsx` (add `ThemeToggle`, place in `Nav`)

**Interfaces:**
- Produces: `<ThemeToggle />` — a client control cycling `light → cloudy → dark`.

- [ ] **Step 1: Add the component** (top of page.tsx, with the other components; page is already `"use client"`):

```tsx
const THEME_ORDER = ["light", "cloudy", "dark"] as const;
type LpTheme = (typeof THEME_ORDER)[number];
const THEME_ICON = { light: Sun, cloudy: Cloud, dark: Moon };

function ThemeToggle() {
  const [theme, setTheme] = useState<LpTheme>("light");
  useEffect(() => {
    const t = (document.documentElement.dataset.theme as LpTheme) || "light";
    setTheme(THEME_ORDER.includes(t) ? t : "light");
  }, []);
  function cycle() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("lifeos.landing.theme", next); } catch {}
  }
  const Icon = THEME_ICON[theme];
  return (
    <button type="button" onClick={cycle} aria-label={`Theme: ${theme}. Switch theme.`}
      className="grid place-items-center w-9 h-9 rounded-[10px]"
      style={{ border: "1px solid var(--lp-line-2)", background: "var(--lp-card)", color: "var(--lp-terra)" }}>
      <Icon size={16} />
    </button>
  );
}
```

Add `Sun, Cloud, Moon` to the lucide-react import.

- [ ] **Step 2: Place it in `Nav`** (before the "Get it on GitHub" button).

- [ ] **Step 3: Verify (preview).** Clicking the toggle cycles light → cloudy → dark, re-skinning everything; reload keeps the last theme (no flash).

---

### Task 3: Hero + faithful AppWindow mockup

**Files:**
- Modify: `marketing/app/page.tsx` (`Hero`, replace `HeroPreview` with `<AppWindow>`)

- [ ] **Step 1: Build `<AppWindow>`** — a Studio-styled app mockup: a `.lp-card` shell containing a left rail (logo + nav rows: Today, Messages, Notes, Whiteboard, Tasks, Finance, Vault — lucide icons, terra active state) and a main area with a top bar (search affordance, theme glyph, clock) over a Today-style grid (net-worth card + sparkline, habits heatmap, a Notes-wall row). All colors from `var(--lp-*)`, so it re-themes. Keep the floating accent chips (BTC, Vault, streak).
- [ ] **Step 2: Re-tune Hero ambient** so `.lp-grid`/`.lp-blob` read on light paper (lower opacity, terra/gold blobs); cloudy uses the aurora.
- [ ] **Step 3: Update hero copy** to current product (drop "track your health"; mention notes, whiteboard, money, messages, AI). Keep stat counters (adjust "themeable" stat if desired).
- [ ] **Step 4: Verify (preview).** Hero looks product-true in all three themes; the AppWindow reads like the real app; mobile + desktop widths OK.

---

### Task 4: Content refresh — marquee, pillars, bento, deep-dives, everything

**Files:**
- Modify: `marketing/app/page.tsx` (data arrays + section visuals)

- [ ] **Step 1: Marquee tags** (`MARQUEE_TAGS`) — remove `Health`, `Connections graph`, `Templates`; add `Messages`, `Whiteboard`, `Cloudy theme`.
- [ ] **Step 2: Pillars** — reword to: Private & local · Your whole life in one place (drop "health") · AI that acts · Beautiful & themeable (light/cloudy/dark).
- [ ] **Step 3: Bento** — replace the Health/Mood card with a **Notes wall** mockup; add a **Whiteboard** card (mini canvas with a few Studio-colored shapes) and a **Messages** card (Gmail-style two-line thread list). Re-skin `BentoFinance/Vault/Goal/Habits/Ask/Music` to tokens (no hardcoded `rgba(255,255,255,…)` — use `var(--lp-*)`).
- [ ] **Step 4: DeepDives** — keep AI, Finance, Vault; add a 4th: **Whiteboard & Messages** ("Think on an infinite canvas. Read your inbox in one place."). Replace the Vault `VaultVisual` whites with tokens.
- [ ] **Step 5: Everything grid** (`EVERYTHING`) — rewrite categories to current features: drop health check-ins/trends, Connections graph, templates, gym; add Messages (Gmail), Whiteboard, cloudy theme; align wording with the README.
- [ ] **Step 6: Verify (preview).** No removed features appear anywhere; Messages + Whiteboard present; every card reads correctly in all three themes (no invisible white-on-paper text).

---

### Task 5: Theme-showcase section, polish, full verification

**Files:**
- Modify: `marketing/app/page.tsx` (new `ThemeShowcase` section + `Landing` order)

- [ ] **Step 1: Add `ThemeShowcase`** — three side-by-side mini app-cards labeled Light / Cloudy / Dark, each hardcoded to its palette (wrap each in a `<div data-theme="…">` scope or inline the three token sets) so all three render at once, with copy like "Three moods. One OS." Insert before `Everything` in `Landing`.
- [ ] **Step 2: Footer/CTA copy** — refresh to drop stale claims; keep GitHub CTA.
- [ ] **Step 3: Full verification.** `cd marketing && npm run build` passes. Preview pass: toggle through light/cloudy/dark (whole page + showcase correct, aurora animates, persists, no flash); responsive at ~390px and ~1440px; console clean; screenshot each theme to show the user.
- [ ] **Step 4: Show the user & await approval; then commit** marketing/ changes + the spec + this plan to `main` (per user's commit-on-approval flow).

---

## Self-Review

**Spec coverage:** visual system → T1; theme toggle → T2; hero + mockups → T3; content refresh (add Messages/Whiteboard, remove Health/Graph/Templates) → T4; theme-showcase → T5; standalone/deployable + default light + cloudy aurora → T1; verification across themes → T1–T5. ✓

**Placeholder scan:** Token values, aurora, toggle logic, and boot script are concrete (verbatim from the app). Section work names exact data arrays/components in page.tsx. No TBDs.

**Consistency:** `data-theme` keys (`light`/`cloudy`/`dark`), the `lifeos.landing.theme` storage key, `--lp-*` names, and the cycle order are identical across T1–T5.
