# Vault redesign — nicer & faster to add — design

Date: 2026-06-22

## Goal

Make the Vault look nicer and make **adding items faster**, especially passwords.
Scope: the empty state, the add/edit modal, and the item cards. Lock / unlock /
settings screens are left as-is. The encryption API (`addItem`/`editItem`) is
untouched — this is purely presentation.

## Decisions

- **Local monogram avatars** for login items — a colored letter-tile derived
  from the name. No favicon fetching, so the vault stays 100% offline (honoring
  "never leaves this device").
- Password **generator uses `crypto.getRandomValues`** (never `Math.random`),
  with unbiased rejection sampling + a secure shuffle.

## Changes

### New helpers (pure, testable)

- `src/lib/vault/generate.ts` — `generatePassword(opts)`:
  - opts: `length` (default 20), `lower`/`upper`/`digits`/`symbols` (all on),
    `avoidAmbiguous` (off).
  - Guarantees ≥1 char from each enabled class, then fills and securely shuffles.
  - Uniform `secureInt(max)` via `crypto.getRandomValues` with rejection sampling.
- `src/lib/vault/avatar.ts` — `monogram(name)` → `{ letter, color }`:
  - First alphanumeric char, uppercased ("?" when empty).
  - Deterministic color from a string hash over a 5-colour theme palette
    (terra / gold / sage / sky / plum); muted when empty.

Strength uses the existing `passcodeStrength` from `vault/types.ts` (no new fn).

### Schema (`src/lib/vault/types.ts`)

- Add an optional `generate?: boolean` flag to `VaultField`. Set it on the
  password-style fields only — `login.password` and `secret.value` — so the
  Generate button appears where generating a value makes sense (not on CVV, API
  keys, or recovery codes, which come from elsewhere).

### Add/edit modal (`item-modal.tsx`)

- **Header avatar**: monogram for `login`; type icon for other types.
- **Generator**: a `Generate` control on `generate` fields. A popover exposes
  length (8–40), symbols/digits/avoid-ambiguous toggles, and a regenerate. On
  generate, the field auto-reveals.
- **Strength meter** under `generate` fields when they have a value.
- **Keyboard**: `⌘/Ctrl+Enter` saves (added to the existing Esc handler); name
  autofocused.
- **Save & add another**: a footer checkbox. When on, save keeps the modal open
  and resets title + data (keeps the type) and refocuses the name.
- New optional prop `initialType?: VaultType` so the empty-state tiles can open
  the modal pre-set to a type. Falls back to `existing?.type ?? "login"`.

### Dashboard (`page.tsx`)

- **Empty state**: six quick-start tiles (one per type). Clicking a tile opens
  the modal pre-set to that type. `creating` boolean + a `createType` state.
- **Login cards**: monogram avatar instead of the generic icon (other types
  keep their type icon). Existing masked-reveal row stays.

## Out of scope

Favicons / any network calls; lock/unlock/settings restyle; changes to crypto,
the provider, or stored shape.

## Verification

`generatePassword` and `monogram` are pure → a quick logic check (length,
guaranteed char classes, charset honoring `avoidAmbiguous`, deterministic
monogram). Then `tsc --noEmit` and `next build`.
