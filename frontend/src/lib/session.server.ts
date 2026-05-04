// ── Server-only session management ──
// This file must NEVER be imported on the client directly.
// Only import via server functions in .functions.ts files.

import { useSession } from "@tanstack/react-start/server";
import type { AuthUser } from "./auth";

export interface SessionData {
	/** Supabase access token (JWT) */
	accessToken?: string;
	/** Supabase refresh token */
	refreshToken?: string;
	/** Application user ID (from our DB, same as Supabase auth.uid) */
	userId?: string;
	/** User email for quick access */
	email?: string;
	/** Cached user profile to avoid an immediate /auth/me roundtrip */
	user?: AuthUser;
	/** When the session was created */
	createdAt?: number;
}

/**
 * Returns the encrypted httpOnly cookie session.
 *
 * Per TanStack Start best practices (auth-session-management):
 * - httpOnly: true → prevents XSS from reading session
 * - secure: true in production → HTTPS only
 * - sameSite: 'lax' → CSRF protection
 * - 7 day expiry
 */
export function useAppSession() {
	return useSession<SessionData>({
		password:
			process.env.SESSION_SECRET ??
			"at-least-32-characters-long-secret-for-dev-only!",
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax" as const,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	});
}
