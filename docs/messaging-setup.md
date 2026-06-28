# Messages — connecting Gmail

Everything runs **in your browser** — no server, no secrets stored anywhere but
this device. You create a free Google OAuth credential (one-time), paste it into
**Settings → Connections**, and sign in.

> **Run the app on `http://localhost:3000`.** The Gmail login is tied to that
> exact origin. If port 3000 is taken, free it first (the dev server sometimes
> auto-picks another port — that will break the OAuth origin match).

---

## Gmail

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

- **Messages** (sidebar) shows your Gmail inbox as threads.
- Open a thread to read it; reply from the composer.
- Hover any message → turn it into a **task** or **note**.
- **Sync now** (in Connections) or it refreshes on app load.
- **Disconnect** wipes the local credentials/session from this device.

> Telegram was removed: running a personal Telegram account in the browser meant
> storing a full-account session on-device and shipping fragile MTProto/crypto
> polyfills. Gmail (standard OAuth) is the cleaner, lower-risk channel. The
> messaging layer stays channel-agnostic, so Telegram (or other channels) could
> be re-added later from git history if wanted.
