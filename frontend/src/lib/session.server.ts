// ── Server-only session management ──
// This file must NEVER be imported on the client directly.
// Only import via server functions in .functions.ts files.

import { createClient } from "@supabase/supabase-js";
import { useSession as getSession } from "@tanstack/react-start/server";
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

// Fail fast in production: a predictable session secret would make
// every session cookie forgeable.
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret && process.env.NODE_ENV === "production") {
	throw new Error(
		"SESSION_SECRET environment variable must be set in production",
	);
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
export function getAppSession() {
	return getSession<SessionData>({
		password:
			sessionSecret ?? "at-least-32-characters-long-secret-for-dev-only!",
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax" as const,
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	});
}

/**
 * Returns a valid access token, refreshing it if expired.
 * Uses JWT expiry check + Supabase refreshSession().
 * Use this in server functions instead of reading session.data.accessToken directly.
 */
export async function getValidAccessToken(): Promise<string> {
	const session = await getAppSession();
	const { accessToken, refreshToken } = session.data;

	if (!refreshToken) {
		await session.clear();
		throw new Error("Session expired. Please log in again.");
	}

	// Check if token is still valid (with 60s buffer)
	if (accessToken) {
		try {
			const { exp } = JSON.parse(atob(accessToken.split(".")[1]));
			if (exp * 1000 > Date.now() + 60_000) {
				return accessToken;
			}
		} catch {
			// Malformed token — refresh
		}
	}

	// Token expired or missing — refresh
	const supabase = createClient(
		process.env.SUPABASE_URL!,
		process.env.SUPABASE_ANON_KEY!,
	);
	const { data, error } = await supabase.auth.refreshSession({
		refresh_token: refreshToken,
	});

	if (error || !data.session) {
		await session.clear();
		throw new Error("Session expired. Please log in again.");
	}

	await session.update({
		accessToken: data.session.access_token,
		refreshToken: data.session.refresh_token,
	});
	return data.session.access_token;
}
