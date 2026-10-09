// ── Server-only session management ──
// This file must NEVER be imported on the client directly.
// Only import via server functions in .functions.ts files.

import { createClient } from "@supabase/supabase-js";
import { useSession as getSession } from "@tanstack/react-start/server";
import type { AuthUser } from "./auth";
import { type RoleName, requireRole } from "./permissions";

export interface SessionData {
	purpose?: "app" | "recovery";
	recoveryUserId?: string;
	recoveryVerifiedAt?: number;
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
interface RefreshResult {
	accessToken: string;
	refreshToken: string;
}

const activeRefreshes = new Map<string, Promise<RefreshResult>>();

export const RECOVERY_SESSION_TTL_MS = 10 * 60 * 1000;

export function isRecoverySession(data: SessionData): boolean {
	return (
		data.purpose === "recovery" &&
		!!data.recoveryUserId &&
		!!data.accessToken &&
		!!data.refreshToken &&
		typeof data.recoveryVerifiedAt === "number" &&
		data.recoveryVerifiedAt <= Date.now() &&
		Date.now() - data.recoveryVerifiedAt < RECOVERY_SESSION_TTL_MS &&
		!data.user &&
		!data.userId
	);
}

export class SessionExpiredError extends Error {}

export async function getValidAccessToken(
	forceRefresh = false,
): Promise<string> {
	const session = await getAppSession();
	if (session.data.purpose === "recovery") {
		throw new Error("Password recovery cannot authorize application requests.");
	}
	const { accessToken, refreshToken } = session.data;

	if (!refreshToken) {
		await session.clear();
		throw new SessionExpiredError("Session expired. Please log in again.");
	}

	// Check if token is still valid (with 60s buffer)
	if (accessToken && !forceRefresh) {
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
	let refreshPromise = activeRefreshes.get(refreshToken);
	if (!refreshPromise) {
		refreshPromise = (async () => {
			try {
				const supabase = createClient(
					process.env.SUPABASE_URL ?? "",
					process.env.SUPABASE_ANON_KEY ?? "",
					{
						auth: {
							persistSession: false,
							autoRefreshToken: false,
							detectSessionInUrl: false,
						},
					},
				);
				const { data, error } = await supabase.auth.refreshSession({
					refresh_token: refreshToken,
				});

				if (error) {
					if (
						error.status &&
						error.status >= 400 &&
						error.status < 500 &&
						error.status !== 429
					) {
						throw new SessionExpiredError(
							"Session expired. Please log in again.",
						);
					}
					throw new Error(
						"Authentication is temporarily unavailable. Please try again.",
					);
				}
				if (!data.session)
					throw new SessionExpiredError(
						"Session expired. Please log in again.",
					);

				return {
					accessToken: data.session.access_token,
					refreshToken: data.session.refresh_token,
				};
			} finally {
				activeRefreshes.delete(refreshToken);
			}
		})();
		activeRefreshes.set(refreshToken, refreshPromise);
	}

	try {
		const result = await refreshPromise;
		await session.update({
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
		});
		return result.accessToken;
	} catch (err) {
		if (err instanceof SessionExpiredError) await session.clear();
		throw err;
	}
}

/**
 * Verifies the logged-in user exists, is active, and possesses at least one of the specified roles.
 * Throws an Error if authorization fails.
 */
export async function authorizeSessionUser(
	...roles: RoleName[]
): Promise<AuthUser> {
	const session = await getAppSession();
	if (session.data.purpose === "recovery") {
		throw new Error("Password recovery cannot authorize application requests.");
	}
	const user = session.data.user;

	if (!user) {
		throw new Error("Unauthorized. Please log in.");
	}

	if (!user.isActive) {
		await session.clear();
		throw new Error(
			"Your account has been deactivated. Contact an administrator.",
		);
	}

	if (requireRole(user, ...roles)) {
		throw new Error("Forbidden. Insufficient permissions.");
	}

	return user;
}
