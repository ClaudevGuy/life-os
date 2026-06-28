# Unified Messages — connecting Telegram & Gmail

Everything runs **in your browser** — no server, no secrets stored anywhere but
this device. You create a free developer credential for each service (one-time),
paste it into **Settings → Connections**, and log in.

> **Run the app on `http://localhost:3000`.** The Gmail login is tied
> to that exact origin. If port 3000 is taken, free it first (the dev server
> sometimes auto-picks another port — that will break the OAuth origin match).
> After pulling these changes, **restart `npm run dev`** so the new
> `next.config.ts` (Turbopack) and dependencies load.

---

## 1. Telegram (your personal account)

**Get credentials** (2 min):
1. Go to **https://my.telegram.org** → log in with your phone number.
2. **API development tools** → create an app (title: anything, e.g. "Life OS";
   platform: Web).
3. Copy the **`api_id`** (a number) and **`api_hash`** (long string).

**Connect in the app:** Settings → Connections → Telegram →
enter `api_id`, `api_hash`, and your phone (e.g. `+15551234567`) → **Send code**
→ type the code Telegram messages you → if you have 2-step verification, enter
your password. Done — your chats appear under **Messages**.

The login session is saved on this device; you won't repeat it. Telegram allows
third-party clients, so there's no ban risk like WhatsApp.

---

## 2. Gmail

**Get credentials** (~10 min):
1. **https://console.cloud.google.com** → create a project.
2. **APIs & Services → Library → Gmail API → Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type **External**; leave publishing status on **Testing**.
   - Add the scope `https://www.googleapis.com/auth/gmail.modify`.
   - Under **Test users**, add your own Gmail address.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type **Web application**.
   - **Authorized JavaScript origins:** add `http://localhost:3000`.
   - (Redirect URIs can be left empty — the token model uses the origin + a popup.)
   - Copy the **Client ID** (`…apps.googleusercontent.com`).

**Connect in the app:** Settings → Connections → Gmail → paste the Client ID →
**Connect Google** → approve. On the first connect you'll see a "Google hasn't
verified this app" screen — that's expected for your own testing app:
**Advanced → Go to Life OS (unsafe) → Allow**.

Notes: access tokens last 1 hour and refresh silently; about once a week you may
need to click **Connect** again (a Testing-mode limitation, not a bug). One scope
(`gmail.modify`) covers reading, replying and marking read. No verification or
security audit is required for personal/testing use.

---

## How it behaves

- **Messages** (sidebar) shows all channels in one inbox; filter by channel.
- Open a thread to read it; reply from the composer (Telegram and Gmail
  support send).
- Hover any message → turn it into a **task** or **note**.
- **Sync now** (per channel in Connections) or it refreshes on app load.
- **Disconnect** any channel anytime — it wipes that channel's local
  credentials/session from this device.

## If something breaks on first connect

This was all built and type-checked but **not yet run end-to-end** (it needs your
credentials). The most likely rough edge is **Telegram bundling in the browser**
(GramJS needs Buffer/process polyfills — already configured in
`next.config.ts` + `src/lib/messaging/polyfill.ts`). If Telegram errors on
connect, copy the browser console error and we'll tune the bundler config.
Gmail is standard OAuth and lower-risk.

> Outlook/Hotmail was removed: Microsoft now requires a directory/tenant to
> register an app, which isn't practical for a personal Hotmail account.
