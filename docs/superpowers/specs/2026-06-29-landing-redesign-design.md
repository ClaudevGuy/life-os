# Landing Page Redesign — Product-True Studio

- **Date:** 2026-06-29
- **Status:** Design approved; spec under review
- **Scope:** Redesign the standalone marketing site in `marketing/` to look like the actual Life OS app and reflect its current feature set.

## Summary

Rebuild the landing page on Life OS's real **Studio** design language (warm paper, terra accent, Geist) instead of the current dark violet-glass marketing aesthetic, showcase the app through **faithful HTML mockups** that re-theme live, refresh all content to the current feature set, and add a working **light / cloudy / dark** theme toggle that mirrors the app — the signature "this is the OS" moment. Default theme: **light (warm paper)**.

## Goals

- The site looks unmistakably like the product — same palette, type, cards, chrome.
- A live theme toggle (light / cloudy / dark) re-skins the whole page, including the cloudy frosted-glass aurora.
- Content is accurate to today's app (adds Messages + Whiteboard; drops Health, Connections graph, Templates, gym).
- Elevated craft throughout — stronger hero, faithful app mockups, refined motion.
- `marketing/` stays a self-contained, Vercel-deployable site (no dependency on the app code).

## Non-goals (YAGNI)

- No real screenshots, no new routes, no backend.
- No import of app source into `marketing/` — the Studio tokens are **ported** (copied) into the marketing CSS so the site stays standalone.

## Visual system

Port the app's Studio tokens (from `src/app/globals.css`) into `marketing/app/globals.css`, scoped by `html[data-theme="…"]`, replacing the entire `--lp-*` system. Three palettes:

- **Light** (`:root`, default): `--bg #F6F1E8`, `--paper #FBF7EE`, `--ink #1A1A1A`, `--muted #8A7F6B`, `--terra #D45A3F`, sage `#7A8B6F`, gold `#C8995A`, plum `#6B4E5C`, sky `#6B89A8`; warm hairline lines; radii 8/12/18/24; warm inset+drop shadows.
- **Dark** (`html[data-theme="dark"]`): `--bg #1A1612`, `--paper #221D17`, `--ink #F2EADB`, `--terra #E7775D`, etc.
- **Cloudy** (`html[data-theme="cloudy"]`): deep indigo `--bg #0B1024`, translucent `--glass` panes with `backdrop-filter: blur(16px) saturate(150%)`, bright hairline borders, luminous accents (terra→azure `#6AA6FF`, sage→mint `#54E6B0`, gold `#FFCE73`), plus the animated **aurora** painted on a fixed `body::before` (the five-radial-gradient field + `cloudy-aurora` keyframes), honoring `prefers-reduced-motion`.

Rename landing classes to a `lp-` set rebuilt on these tokens (or reuse the names with new values): `.lp-card` = paper + 12px radius + `--shadow-1`, with a cloudy override adding the glass blur; `.lp-glass`, `.lp-chip`, `.lp-btn-primary/-ghost`, `.lp-shine` (headline gradient — warm in light/dark, white→azure→mint in cloudy). Type: **Geist / Geist Mono** (ensure both are loaded in `marketing/app/layout.tsx`).

## Theme toggle

- A 3-state control in the nav cycling **light → cloudy → dark** (sun / cloud / moon), mirroring the app's toggle.
- Sets `document.documentElement.dataset.theme`; persists to `localStorage` under `lifeos.landing.theme`; a small inline boot script in `layout.tsx` applies the saved theme before paint (no flash), defaulting to `light`.
- All sections and mockups are built from the theme tokens, so the toggle re-skins everything — the cloudy aurora and glass appear automatically.

## Page structure

1. **Nav** — logo, anchor links, the live theme toggle, "Get it on GitHub".
2. **Hero** — kicker chip, headline + sub + CTAs + animated stat counters, beside a **faithful app-window mockup**: real sidebar (Today/Messages/Notes/Whiteboard/…) + top bar + a Today-style content area built from Studio cards. Floating accent chips. Subtle ambient background tuned per theme (paper grain in light, warm glow in dark, aurora in cloudy).
3. **Marquee** — refreshed scrolling feature tags (current features only).
4. **Video** — keep the existing `/life-os.mp4` demo section, re-skinned.
5. **Pillars** — 4 "why" cards: Private & local · Your whole life in one place · AI that acts · Beautiful & themeable.
6. **Bento toolkit** — faithful mini-mockups of real surfaces in Studio styling: Today, **Notes wall**, **Whiteboard** (new), Finance, Habits & Focus, Goals, Vault, **Messages** (new), Ask, Music.
7. **Deep-dives** — alternating spotlights: Agentic AI · Finance (live) · Private/Vault · **Whiteboard & Messages** (new).
8. **Theme showcase** *(new)* — one representative surface shown across light / cloudy / dark side by side, foregrounding the cloudy-mirror mode.
9. **Everything grid** — full current feature list by category (mirrors the README), no removed features.
10. **Final CTA + Footer**.

## Faithful HTML mockups

Recreate app chrome in marketing components using the Studio tokens (no app imports):
- A reusable `<AppWindow>` shell (rounded card, top bar with the live clock/search affordance, left rail with the real nav items + lucide icons).
- Surface mini-mockups: Notes card-wall, a small Excalidraw-style whiteboard (a few shapes), finance net-worth card + sparkline, habits heatmap + focus ring, goal ring, a Gmail-style messages two-pane snippet.
- All use theme variables so they re-skin with the toggle.

## Content refresh

- **Add:** Messages (Gmail inbox), Whiteboard (infinite Excalidraw canvas), the cloudy theme, theme toggle.
- **Remove:** Health & health check-ins, Connections graph, Templates, gym.
- Re-word pillars/marquee/everything to match the updated README.

## Implementation

- `marketing/app/globals.css` — replace `--lp-*` with the ported Studio token sets (light/cloudy/dark) + aurora + glass + class rebuild.
- `marketing/app/page.tsx` — restructure sections, add the theme toggle + `<AppWindow>` mockups, refresh all copy. Keep the `Reveal`/`Counter` motion helpers.
- `marketing/app/layout.tsx` — ensure Geist/Geist Mono are loaded; add the no-flash theme boot script; `suppressHydrationWarning` on `<html>` if needed.
- Keep `marketing/` standalone and deployable (no `@/…` app imports).

## Motion & accessibility

- Keep IntersectionObserver reveals and count-ups; respect `prefers-reduced-motion` (already honored for the aurora).
- Maintain heading hierarchy, focus-visible states on the toggle and CTAs, and sufficient contrast in all three themes.

## Verification

Drive `marketing/` in the Claude Preview tool:
- Each theme (light / cloudy / dark) renders correctly; the toggle re-skins the whole page incl. the cloudy aurora/glass; choice persists across reload with no flash.
- Hero + all sections render; mockups look product-true; console clean.
- Content shows Messages + Whiteboard and no longer shows Health/Graph/Templates.
- Responsive at mobile and desktop widths; `npm run build` (in `marketing/`) passes.

## Decided defaults (adjustable)

- Default theme: **light (warm paper)**.
- Keep the existing demo video and the GitHub CTA target.
