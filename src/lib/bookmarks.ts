/**
 * Bookmarks are items of kind="bookmark" with metadata:
 *   {
 *     url: string,              // the saved URL
 *     platform: string,         // detected platform name ("X", "YouTube", ...)
 *     host: string,             // raw hostname
 *     color: string,            // CSS variable for the platform color
 *     tags?: string[],
 *   }
 *
 * Title is stored on the item itself (`title`). Optional description goes
 * in `body`. The platform/host/color get re-derived from the URL on read
 * so old bookmarks pick up new platform mappings automatically.
 */

export type Platform = {
  name: string;
  color: string;
  /** Optional emoji or one-char visual fallback when no logo. */
  glyph?: string;
};

/**
 * Map of host-suffix → platform. Look-ups walk subdomain → root, so any
 * `www.foo.bar` or `m.foo.bar` resolves to `foo.bar` if present here.
 */
const HOSTS: Record<string, Platform> = {
  "twitter.com": { name: "X", color: "var(--ink)" },
  "x.com": { name: "X", color: "var(--ink)" },
  "youtube.com": { name: "YouTube", color: "var(--terra)" },
  "youtu.be": { name: "YouTube", color: "var(--terra)" },
  "github.com": { name: "GitHub", color: "var(--ink-2)" },
  "gitlab.com": { name: "GitLab", color: "var(--terra)" },
  "linkedin.com": { name: "LinkedIn", color: "var(--sky)" },
  "instagram.com": { name: "Instagram", color: "var(--plum)" },
  "reddit.com": { name: "Reddit", color: "var(--terra)" },
  "redd.it": { name: "Reddit", color: "var(--terra)" },
  "medium.com": { name: "Medium", color: "var(--ink-2)" },
  "substack.com": { name: "Substack", color: "var(--terra)" },
  "tiktok.com": { name: "TikTok", color: "var(--ink)" },
  "spotify.com": { name: "Spotify", color: "var(--sage)" },
  "soundcloud.com": { name: "SoundCloud", color: "var(--terra)" },
  "vimeo.com": { name: "Vimeo", color: "var(--sky)" },
  "dribbble.com": { name: "Dribbble", color: "var(--plum)" },
  "behance.net": { name: "Behance", color: "var(--sky)" },
  "figma.com": { name: "Figma", color: "var(--terra)" },
  "notion.so": { name: "Notion", color: "var(--ink)" },
  "notion.site": { name: "Notion", color: "var(--ink)" },
  "vercel.com": { name: "Vercel", color: "var(--ink)" },
  "pinterest.com": { name: "Pinterest", color: "var(--terra)" },
  "producthunt.com": { name: "Product Hunt", color: "var(--terra)" },
  "claude.ai": { name: "Claude", color: "var(--gold)" },
  "anthropic.com": { name: "Anthropic", color: "var(--gold)" },
  "chatgpt.com": { name: "ChatGPT", color: "var(--sage)" },
  "openai.com": { name: "OpenAI", color: "var(--sage)" },
  "google.com": { name: "Google", color: "var(--sky)" },
  "arxiv.org": { name: "arXiv", color: "var(--plum)" },
  "stackoverflow.com": { name: "Stack Overflow", color: "var(--terra)" },
  "news.ycombinator.com": { name: "Hacker News", color: "var(--terra)" },
  "apple.com": { name: "Apple", color: "var(--ink)" },
  "amazon.com": { name: "Amazon", color: "var(--gold)" },
  "netflix.com": { name: "Netflix", color: "var(--bad)" },
  "wikipedia.org": { name: "Wikipedia", color: "var(--ink)" },
  "nytimes.com": { name: "NY Times", color: "var(--ink)" },
  "bloomberg.com": { name: "Bloomberg", color: "var(--ink-2)" },
  "ft.com": { name: "Financial Times", color: "var(--plum)" },
  "theverge.com": { name: "The Verge", color: "var(--plum)" },
  "wired.com": { name: "Wired", color: "var(--ink)" },
  "techcrunch.com": { name: "TechCrunch", color: "var(--sage)" },
  "stripe.com": { name: "Stripe", color: "var(--plum)" },
  "github.io": { name: "GitHub Pages", color: "var(--ink-2)" },
};

const FALLBACK_PALETTE = [
  "var(--terra)",
  "var(--gold)",
  "var(--sage)",
  "var(--plum)",
  "var(--sky)",
];

function colorForString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

/** Normalize input into a URL — adds https:// if no protocol. */
export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(t).toString();
  } catch {
    try {
      return new URL(`https://${t}`).toString();
    } catch {
      return null;
    }
  }
}

export function detectPlatform(url: string): {
  name: string;
  color: string;
  host: string;
} {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // Exact host match
    if (HOSTS[host]) return { ...HOSTS[host], host };

    // Walk subdomains down to root (e.g. m.youtube.com → youtube.com)
    const parts = host.split(".");
    for (let i = 1; i < parts.length; i++) {
      const sub = parts.slice(i).join(".");
      if (HOSTS[sub]) return { ...HOSTS[sub], host };
    }

    // Unknown host — pretty-print the second-level domain as the name
    const base =
      parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? "Link";
    return {
      name: base.charAt(0).toUpperCase() + base.slice(1),
      color: colorForString(host),
      host,
    };
  } catch {
    return { name: "Link", color: "var(--muted-2)", host: "" };
  }
}

/** Initial for a platform monogram tile. */
export function platformInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  if (t.toLowerCase() === "x") return "X";
  return t[0].toUpperCase();
}

/** Short relative-time label. */
export function relDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}
