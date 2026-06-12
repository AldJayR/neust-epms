// ── Server-only Supabase client ──
// This file must NEVER be imported on the client directly.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;

/**
 * Supabase client for server-side auth operations (signUp, signIn).
 * Uses the anon key — NOT the service role key — because we're
 * acting on behalf of the user, not as a privileged admin.
 *
 * Session persistence is disabled: this module-level client is shared
 * across all concurrent SSR requests, so storing auth state on it would
 * leak/race session data between users. We only ever use the values
 * returned by each call (never client-held state).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
		detectSessionInUrl: false,
	},
});
