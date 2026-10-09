import { createClient } from "@supabase/supabase-js";
import { env } from "@/env.js";

export const supabase = createClient(
	env.SUPABASE_URL,
	env.SUPABASE_SERVICE_ROLE_KEY,
	{
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	},
);

/** Request-local client: sign-in must never mutate the privileged client's session. */
export function createUserAuthClient() {
	return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
}
