// ledger.ts — a tamper-evident, hash-chained log. Used for the per-system vendor
// history ("who serviced this system, when they left, who replaced them"): each
// entry carries the hash of the one before it, so the chain reads like a private
// blockchain — you can't quietly rewrite history without every later hash failing
// verification. No crypto deps: a fast FNV-1a digest is plenty for a visible,
// auditable record (this isn't securing money, it's making edits provable).

export type LedgerAction = "assigned" | "replaced" | "removed";

export interface LedgerEntry {
  seq: number;
  vendor: string;
  action: LedgerAction;
  at: string; // ISO timestamp
  by: string; // who recorded the change
  reason?: string;
  prevHash: string;
  hash: string;
}

export const GENESIS_HASH = "0000000000";

// FNV-1a 32-bit, widened to a 10-char hex string for a chunkier "block hash" look.
function digest(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const lo = (h >>> 0).toString(16).padStart(8, "0");
  // fold a second pass for a couple more characters of visual heft
  let g = 0x811c9dc5 ^ h;
  for (let i = input.length - 1; i >= 0; i--) { g ^= input.charCodeAt(i); g = Math.imul(g, 0x01000193); }
  return (lo + (g >>> 0).toString(16)).slice(0, 10);
}

function hashOf(e: Omit<LedgerEntry, "hash">): string {
  return digest(`${e.seq}|${e.action}|${e.vendor}|${e.at}|${e.by}|${e.reason || ""}|${e.prevHash}`);
}

/** Append one entry, chaining it to the tail of `prev`. Pure — returns a new array. */
export function appendLedger(prev: LedgerEntry[], e: Omit<LedgerEntry, "seq" | "prevHash" | "hash">): LedgerEntry[] {
  const last = prev[prev.length - 1];
  const seq = (last?.seq ?? -1) + 1;
  const prevHash = last?.hash ?? GENESIS_HASH;
  const base = { ...e, seq, prevHash };
  return [...prev, { ...base, hash: hashOf(base) }];
}

/** The first block of a chain — the vendor of record when the system was onboarded. */
export function genesisLedger(vendor: string, atISO: string, by = "System of record"): LedgerEntry[] {
  return appendLedger([], { vendor, action: "assigned", at: atISO, by, reason: "Vendor of record at onboarding" });
}

/** Walk the chain and confirm every link still hashes correctly. */
export function verifyLedger(entries: LedgerEntry[]): boolean {
  let prevHash = GENESIS_HASH;
  for (const e of entries) {
    if (e.prevHash !== prevHash) return false;
    if (hashOf(e) !== e.hash) return false;
    prevHash = e.hash;
  }
  return true;
}
