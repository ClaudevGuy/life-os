/**
 * Cryptographically-secure password generator. Uses `crypto.getRandomValues`
 * (never `Math.random`) with rejection sampling so every character is uniform,
 * and a secure Fisher–Yates shuffle so the guaranteed-coverage characters don't
 * cluster at the front.
 */

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;

/** Look-alike characters dropped when `avoidAmbiguous` is on. */
const AMBIGUOUS = new Set("O0oIl1|`'\"".split(""));

export type GenOpts = {
  length?: number;
  lower?: boolean;
  upper?: boolean;
  digits?: boolean;
  symbols?: boolean;
  avoidAmbiguous?: boolean;
};

export const DEFAULT_GEN: Required<GenOpts> = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
};

export const GEN_MIN = 8;
export const GEN_MAX = 40;

/** Uniform integer in [0, max) from the CSPRNG, free of modulo bias. */
function secureInt(max: number): number {
  if (max <= 0) return 0;
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

export function generatePassword(opts: GenOpts = {}): string {
  const o = { ...DEFAULT_GEN, ...opts };
  const length = Math.max(GEN_MIN, Math.min(GEN_MAX, Math.round(o.length)));

  const strip = (s: string) =>
    o.avoidAmbiguous ? [...s].filter((c) => !AMBIGUOUS.has(c)).join("") : s;

  const classes: string[] = [];
  if (o.lower) classes.push(strip(SETS.lower));
  if (o.upper) classes.push(strip(SETS.upper));
  if (o.digits) classes.push(strip(SETS.digits));
  if (o.symbols) classes.push(strip(SETS.symbols));
  if (classes.length === 0) classes.push(strip(SETS.lower)); // always something

  const all = classes.join("");
  const out: string[] = [];

  // One char from each enabled class first, so coverage is guaranteed.
  for (const set of classes) {
    if (out.length < length && set.length) out.push(set[secureInt(set.length)]);
  }
  while (out.length < length) out.push(all[secureInt(all.length)]);

  // Secure shuffle so the leading guaranteed chars are not positional.
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out.join("");
}
