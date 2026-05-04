// ── Server-only Supabase client ──
// This file must NEVER be imported on the client directly.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/**
 * Supabase client for server-side auth operations (signUp, signIn).
 * Uses the anon key — NOT the service role key — because we're
 * acting on behalf of the user, not as a privileged admin.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
