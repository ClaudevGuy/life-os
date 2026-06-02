/**
 * Repo-link helpers. A project can carry `metadata.repoUrl` — a link to its
 * source repo (GitHub, GitLab, Bitbucket, …). We parse it into owner/repo so
 * the UI can show "vercel / next.js" instead of a raw URL, with the right
 * provider mark.
 *
 * Pure string parsing — no network. Linking a repo never phones home.
 */

export type GitProvider = "github" | "gitlab" | "bitbucket" | "other";

export type RepoRef = {
  /** Normalized https URL, no trailing slash / query / hash. Openable. */
  url: string;
  /** Hostname, e.g. "github.com". */
  host: string;
  /** First path segment, e.g. "vercel". */
  owner: string;
  /** Second path segment with any .git suffix stripped, e.g. "next.js". */
  repo: string;
  provider: GitProvider;
};

const PROVIDER_LABEL: Record<GitProvider, string> = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  other: "Repository",
};

export function providerLabel(p: GitProvider): string {
  return PROVIDER_LABEL[p];
}

/**
 * Normalize loose input into a canonical repo URL.
 *   - "vercel/next.js"           → https://github.com/vercel/next.js
 *   - "github.com/a/b"           → https://github.com/a/b
 *   - "https://github.com/a/b/"  → https://github.com/a/b
 * Returns null if it can't be made into a URL.
 */
export function normalizeRepoUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  // "owner/repo" shorthand → assume GitHub.
  if (/^[\w.-]+\/[\w.-]+$/.test(t)) {
    return `https://github.com/${t}`;
  }

  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return null;
  }
}

export function parseRepo(raw: string | null | undefined): RepoRef | null {
  if (!raw) return null;
  const norm = normalizeRepoUrl(raw);
  if (!norm) return null;

  let u: URL;
  try {
    u = new URL(norm);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "");
  const provider: GitProvider = host.includes("github")
    ? "github"
    : host.includes("gitlab")
      ? "gitlab"
      : host.includes("bitbucket")
        ? "bitbucket"
        : "other";

  const parts = u.pathname.split("/").filter(Boolean);
  const owner = parts[0] ?? "";
  const repo = (parts[1] ?? "").replace(/\.git$/i, "");

  return { url: norm, host, owner, repo, provider };
}
