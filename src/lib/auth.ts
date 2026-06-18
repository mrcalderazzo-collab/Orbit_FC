// auth.ts — real authentication via Supabase Auth. Dormant until the project is
// configured (isSupabaseConfigured); the demo account picker keeps working until
// then. On sign-in we load the matching app_users profile — that becomes the
// session's currentUser, carrying persona/role/org so RLS + the UI scope correctly.
import { supabase, requireSupabase, isSupabaseConfigured } from "./supabase";

export interface AppUserRow {
  id: string;
  org_id: string;
  persona: "operator" | "board" | "resident" | "vendor" | "super";
  role: string | null;
  name: string;
  email: string | null;
  title: string | null;
  initials: string | null;
  color: string | null;
  company: string | null;
  building_id: string | null;
}

/** email + password sign-in. Returns the app_users profile. */
export async function signIn(email: string, password: string): Promise<AppUserRow> {
  const sb = requireSupabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await currentAppUser();
  if (!profile) throw new Error("Signed in, but no app_users profile is linked to this account.");
  return profile;
}

/** passwordless magic-link sign-in (sends an email). */
export async function signInWithMagicLink(email: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** the app_users profile for the active session, or null if none. */
export async function currentAppUser(): Promise<AppUserRow | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("app_users").select("*").eq("id", user.id).single();
  if (error) return null;
  return data as AppUserRow;
}

/** subscribe to sign-in / sign-out; returns an unsubscribe fn. */
export function onAuthChange(cb: (user: AppUserRow | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(async () => { cb(await currentAppUser()); });
  return () => data.subscription.unsubscribe();
}

export { isSupabaseConfigured };
