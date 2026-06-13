// Formatting + deterministic RNG helpers. Ported from the prototype so the
// seed generator produces the same believable value ranges.

export const fmtMoney = (n: number, compact = true): string => {
  if (compact) {
    if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  }
  return "$" + n.toLocaleString("en-US");
};

export const fmtPct = (n: number): string => (n * 100).toFixed(1) + "%";

export const moneyShort = (n: number): string =>
  n >= 1000 ? "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : "$" + n;

export const moneyFull = (n: number): string => "$" + n.toLocaleString("en-US");

export const tint = (c: string, p: number): string =>
  `color-mix(in srgb, ${c} ${p}%, transparent)`;

// "now" is pinned to the prototype's storyline moment so relative times read
// the same against the seeded data.
const NOW = new Date("2026-06-09T08:51:00");

export const relTime = (iso: string): string => {
  const d = new Date(iso);
  const h = Math.round((NOW.getTime() - d.getTime()) / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return h + "h ago";
  return Math.round(h / 24) + "d ago";
};

// ── deterministic seeded RNG (FNV-1a + LCG) ─────────────────────────────
export function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(s: number): () => number {
  let state = s >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export const NOW_SEED = new Date("2026-06-09T08:51:00");
export function dateShift(days: number): string {
  const d = new Date(NOW_SEED.getTime() + days * 864e5);
  return d.toISOString().slice(0, 10);
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}
