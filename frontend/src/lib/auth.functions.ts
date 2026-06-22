// ── Auth server functions (.functions.ts → safe to import on client) ──
// Per file-separation skill: .functions.ts files wrap server-only logic
// in createServerFn, so the build replaces them with RPC stubs on the client.

import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiErrorResponse, AuthUser } from "./auth";
import { type RoleName, requireRole } from "./permissions";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const USER_PROFILE_CACHE_TTL_MS = 1000 * 30; // 30 seconds

/**
 * Safely extracts error messages from API responses, handling both JSON and non-JSON errors
 */
export async function getErrorMessage(
	response: Response,
	defaultMessage: string,
): Promise<string> {
	try {
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			const body = (await response.json()) as ApiErrorResponse;
			return body.error?.message ?? defaultMessage;
		}
		const text = await response.text();
		if (text && text.length < 200) {
			return text;
		}
	} catch {
		// Ignore parsing errors
	}
	return defaultMessage;
}

// ── Schemas ───────────────────────────────────────────────

const loginSchema = z.object({
	email: z.email(),
	password: z.string().min(1),
});

const signupSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	departmentId: z.string().min(1),
	campusId: z.string().min(1),
	academicRank: z.string().min(1),
});

// ── Login ─────────────────────────────────────────────────

export const loginFn = createServerFn({ method: "POST" })
	.validator(loginSchema)
	.handler(async ({ data }) => {
		const { getAppSession } = await import("./session.server");
		const { supabase } = await import("./supabase.server");

		const [session, { data: authData, error: authError }] = await Promise.all([
			getAppSession(),
			supabase.auth.signInWithPassword({
				email: data.email,
				password: data.password,
			}),
		]);

		if (authError || !authData.session) {
			return {
				error: true as const,
				message: authError?.message ?? "Invalid email or password",
			};
		}

		// 2. Verify user exists in our backend (GET /auth/me)
		const meResponse = await fetch(`${API_BASE}/auth/me`, {
			headers: {
				Authorization: `Bearer ${authData.session.access_token}`,
			},
		});

		if (!meResponse.ok) {
			const message = await getErrorMessage(
				meResponse,
				"Your account has not been provisioned. Contact an administrator.",
			);
			return {
				error: true as const,
				message,
			};
		}

		const user = (await meResponse.json()) as AuthUser;

		if (!user.isActive) {
			return {
				error: true as const,
				message: "Your account has been deactivated. Contact an administrator.",
			};
		}

		// 3. Store tokens in encrypted httpOnly session
		const sessionData = {
			accessToken: authData.session.access_token,
			refreshToken: authData.session.refresh_token,
			userId: user.userId,
			email: user.email,
			user,
			createdAt: Date.now(),
		};
		await session.update(sessionData);

		// 4. Return success; client handles SPA navigation
		return {
			error: false as const,
			user,
		};
	});

export interface SearchUserResponse {
	userId: string;
	firstName: string;
	lastName: string;
	email: string;
}

export const searchUsersFn = createServerFn({ method: "GET" })
	.validator(z.object({ search: z.string().min(1) }))
	.handler(async ({ data }) => {
		const { authorizeSessionUser, getValidAccessToken } = await import(
			"./session.server"
		);
		// Require an authenticated user with any of our active roles
		await authorizeSessionUser("RET Chair", "Director", "Super Admin");
		const accessToken = await getValidAccessToken();

		const query = new URLSearchParams({ search: data.search });
		const response = await fetch(`${API_BASE}/auth/users/search?${query}`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to search users");
			throw new Error(message);
		}
		return (await response.json()) as SearchUserResponse[];
	});

// ── Signup ────────────────────────────────────────────────

export const signupFn = createServerFn({ method: "POST" })
	.validator(signupSchema)
	.handler(async ({ data }) => {
		// Call our backend register endpoint
		const response = await fetch(`${API_BASE}/auth/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...data,
				campusId: Number(data.campusId),
				departmentId: data.departmentId ? Number(data.departmentId) : undefined,
			}),
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Registration failed");
			return {
				error: true as const,
				message,
			};
		}

		const user = (await response.json()) as AuthUser;

		return {
			error: false as const,
			message:
				"Registration successful! Please wait for an administrator to activate your account.",
			userId: user.userId,
		};
	});

// ── Logout ────────────────────────────────────────────────

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
	const { getAppSession } = await import("./session.server");
	const session = await getAppSession();
	await session.clear();
	throw redirect({ to: "/login" });
});

// ── Public lookup data (no auth required) ─────────────────

interface LookupItem {
	id: number;
	name: string;
}

export const getDepartmentsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const response = await fetch(`${API_BASE}/auth/departments`);
		if (!response.ok) return [] as LookupItem[];
		return (await response.json()) as LookupItem[];
	},
);

export const getCampusesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const response = await fetch(`${API_BASE}/auth/campuses`);
		if (!response.ok) return [] as LookupItem[];
		return (await response.json()) as LookupItem[];
	},
);

// ── Password breach check ──

export const checkPasswordFn = createServerFn({ method: "POST" })
	.validator(z.object({ password: z.string().min(1) }))
	.handler(async ({ data }) => {
		const response = await fetch(`${API_BASE}/auth/check-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			return { compromised: false };
		}

		return (await response.json()) as { compromised: boolean };
	});

// ── Get Current User ──────────────────────────────────────

export const getCurrentUserFn = createServerFn({ method: "POST" })
	.validator(z.void())
	.handler(async () => {
		const { getAppSession, getValidAccessToken } = await import(
			"./session.server"
		);
		const { supabase } = await import("./supabase.server");

		const session = await getAppSession();
		const { userId, user, createdAt } = session.data;

		if (
			user &&
			createdAt &&
			Date.now() - createdAt < USER_PROFILE_CACHE_TTL_MS
		) {
			if (!user.isActive) {
				await session.clear();
				return null;
			}
			return user;
		}

		if (!userId) {
			return null;
		}

		let token: string;
		try {
			token = await getValidAccessToken();
		} catch {
			await session.clear();
			return null;
		}

		// Validate the token is still valid by calling our backend
		const meResponse = await fetch(`${API_BASE}/auth/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!meResponse.ok) {
			// Token may be expired — try refresh before clearing session
			if (session.data.refreshToken) {
				try {
					const { data: refreshData, error: refreshError } =
						await supabase.auth.refreshSession({
							refresh_token: session.data.refreshToken,
						});

					if (!refreshError && refreshData.session) {
						// Retry with new token
						const retryResponse = await fetch(`${API_BASE}/auth/me`, {
							headers: {
								Authorization: `Bearer ${refreshData.session.access_token}`,
							},
						});

						if (retryResponse.ok) {
							const currentUser = (await retryResponse.json()) as AuthUser;
							if (!currentUser.isActive) {
								await session.clear();
								return null;
							}
							const refreshSessionData = {
								accessToken: refreshData.session.access_token,
								refreshToken: refreshData.session.refresh_token,
								userId: currentUser.userId,
								email: currentUser.email,
								user: currentUser,
								createdAt: Date.now(),
							};
							await session.update(refreshSessionData);
							return currentUser;
						}
					}
				} catch {
					// Refresh failed, fall through to clear session
				}
			}
			// Token expired and refresh failed — clear session
			await session.clear();
			return null;
		}

		const currentUser = (await meResponse.json()) as AuthUser;
		if (!currentUser.isActive) {
			await session.clear();
			return null;
		}

		const currentUserSessionData = {
			accessToken: token,
			refreshToken: session.data.refreshToken,
			userId,
			email: currentUser.email,
			user: currentUser,
			createdAt: Date.now(),
		};
		await session.update(currentUserSessionData);

		return currentUser;
	});
