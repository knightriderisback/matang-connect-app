import { createClient } from "@supabase/supabase-js";

// SUPABASE_SERVICE_ROLE_KEY must stay server-only — never prefix with
// NEXT_PUBLIC_, never import this file from a "use client" component.
// Authorization is NOT enforced by RLS when using this client — every
// API route that uses it MUST check the session (see lib/auth/getSession.ts)
// and the user's role itself before reading/writing anything.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, get it from Supabase Dashboard > Project Settings > API)."
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
