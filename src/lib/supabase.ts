// supabase.ts — the real backend client. Orbit is a Vite SPA, so we use the
// Supabase JS SDK directly with Row-Level Security enforcing access (the same
// persona/portfolio rules we built in identity.ts, now at the database layer).
//
// Until VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set in .env, the client is
// null and the app keeps running on the in-memory OrbitProvider store. We migrate
// the store's action surface to these calls table by table — nothing breaks while
// the env is empty. See BACKEND.md for setup.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true once the project URL + anon key are configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** The Supabase client, or null when unconfigured (dev/in-memory mode). */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

/** Throws a clear error if a backend call is attempted before configuration. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error("Supabase is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see BACKEND.md).");
  return supabase;
}
