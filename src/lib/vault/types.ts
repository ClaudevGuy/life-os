/** Shared vault types + per-type field schemas. */

export type VaultType = "login" | "card" | "note" | "codes" | "secret";

export type VaultEntry = {
  id: string;
  type: VaultType;
  title: string;
  data: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
};

export type VaultField = {
  key: string;
  label: string;
  secret?: boolean;
  textarea?: boolean;
  placeholder?: string;
};

export const VAULT_TYPES: { type: VaultType; label: string }[] = [
  { type: "login", label: "Login" },
  { type: "card", label: "Card" },
  { type: "codes", label: "Recovery codes" },
  { type: "secret", label: "Secret" },
  { type: "note", label: "Secure note" },
];

export const VAULT_TYPE_LABEL: Record<VaultType, string> = {
  login: "Login",
  card: "Card",
  codes: "Recovery codes",
  secret: "Secret",
  note: "Secure note",
};

export const TYPE_FIELDS: Record<VaultType, VaultField[]> = {
  login: [
    { key: "username", label: "Username / email", placeholder: "you@email.com" },
    { key: "password", label: "Password", secret: true },
    { key: "url", label: "Website", placeholder: "https://…" },
    { key: "notes", label: "Notes", textarea: true },
  ],
  card: [
    { key: "cardholder", label: "Cardholder", placeholder: "Name on card" },
    { key: "number", label: "Card number", secret: true, placeholder: "•••• •••• •••• ••••" },
    { key: "expiry", label: "Expiry", placeholder: "MM/YY" },
    { key: "cvv", label: "CVV", secret: true, placeholder: "•••" },
    { key: "notes", label: "Notes", textarea: true },
  ],
  codes: [
    { key: "codes", label: "Recovery codes", secret: true, textarea: true, placeholder: "One per line" },
    { key: "notes", label: "Notes", textarea: true },
  ],
  secret: [
    { key: "value", label: "Secret", secret: true, textarea: true },
    { key: "notes", label: "Notes", textarea: true },
  ],
  note: [{ key: "body", label: "Note", textarea: true }],
};

/** Which field is shown (masked) as the card's headline secret. */
export function primaryField(type: VaultType): string | null {
  switch (type) {
    case "login":
      return "password";
    case "card":
      return "number";
    case "codes":
      return "codes";
    case "secret":
      return "value";
    case "note":
      return null;
  }
}

/** A non-secret line to show under the title on a card. */
export function subtitleFor(entry: VaultEntry): string | null {
  const d = entry.data;
  switch (entry.type) {
    case "login":
      return d.username || hostOf(d.url) || null;
    case "card":
      return d.cardholder || (d.expiry ? `exp ${d.expiry}` : null);
    case "codes":
      return `${(d.codes ?? "").split("\n").filter(Boolean).length} codes`;
    case "secret":
      return null;
    case "note":
      return (d.body ?? "").split("\n")[0]?.slice(0, 60) || null;
  }
}

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).host;
  } catch {
    return url;
  }
}

/** Rough password strength 0–4 for the setup hint. */
export function passcodeStrength(p: string): { score: number; label: string } {
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
  const label = ["Too short", "Weak", "Okay", "Good", "Strong"][score] ?? "Weak";
  return { score, label };
}
