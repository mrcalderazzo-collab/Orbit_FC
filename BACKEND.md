# Orbit FC — Backend setup (Supabase)

The app ships as a Vite SPA that runs entirely on an in-memory store, so it works
with **zero backend**. This guide turns on the **real backend** — Postgres + Auth +
Storage — using **Supabase**, chosen because it's one platform (no separate DB,
auth, and file vendors) and its Row-Level Security enforces the same persona /
portfolio scoping we built in `src/data/identity.ts`, at the database layer.

Nothing here breaks the running app: until `.env.local` has the two Supabase
values, `src/lib/supabase.ts` exports `null` and the store keeps driving everything.

---

## What you do (≈10 minutes, one-time)

1. **Create a Supabase project** → https://supabase.com → New project. Pick a region
   near NYC (us-east-1). Save the database password.
2. **Run the schema.** Supabase dashboard → **SQL Editor** → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → Run.
3. **Run the policies.** New query → paste all of
   [`supabase/policies.sql`](supabase/policies.sql) → Run. (RLS is now on.)
4. **Copy your keys.** Project Settings → **API**:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
5. **Create `.env.local`** in the repo root (copy from `.env.example`) and paste the
   two values. Restart `npm run dev`.
6. **(Vercel)** add the same two vars in Project → Settings → Environment Variables,
   then redeploy.

That's it — the client is now connected. `isSupabaseConfigured` flips to `true`.

---

## What I do (the code migration — table by table)

The OrbitProvider action surface is the swap boundary. We migrate one slice at a
time so the app stays green throughout:

1. **Auth** — replace the demo account picker (`Login.tsx`) with Supabase Auth
   (email/password or magic link). On sign-in, load the `app_users` row → that's
   `currentUser`. Seed your real team + buildings into `app_users` / `buildings`.
2. **Tickets** — point `createTicket` / `setTicketStatus` / `routeTicket` /
   `assignTicket` at `tickets`; subscribe to changes (Supabase Realtime) so the
   board is live across users. The event spine writes to `ticket_events`.
3. **Then** notices, emergencies, building_docs, vendors, integrations — each is a
   thin `supabase.from(...)` swap behind the same store action.
4. **Files (#46)** — `building_docs.storage_path` points at a Supabase **Storage**
   bucket; the Log-file / system-doc actions upload the binary, RLS-scoped per org.

## Still separate (not Supabase)
- **SMS (#45)** — Twilio. Send from a **Supabase Edge Function** (so the auth token
  stays server-side), triggered by the comms actions. Email via Resend the same way.
- **AI (#48)** — live Claude calls also run in an Edge Function with
  `ANTHROPIC_API_KEY` as a function secret (never in the client).

## Migration order (lowest risk → highest value)
auth → tickets + events → comms/notices → emergencies → docs+storage → edge
functions (Twilio/Resend/Claude).
