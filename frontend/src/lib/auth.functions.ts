// ── Auth server functions (.functions.ts → safe to import on client) ──
// Per file-separation skill: .functions.ts files wrap server-only logic
// in createServerFn, so the build replaces them with RPC stubs on the client.

import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiErrorResponse, AuthUser } from "./auth";
import { getValidAccessToken, getAppSession } from "./session.server";
import { supabase } from "./supabase.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const USER_PROFILE_CACHE_TTL_MS = 1000 * 60 * 5;

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
			const errorBody = (await meResponse.json()) as ApiErrorResponse;
			return {
				error: true as const,
				message:
					errorBody.error?.message ??
					"Your account has not been provisioned. Contact an administrator.",
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
		const accessToken = await getValidAccessToken();

		const query = new URLSearchParams({ search: data.search });
		const response = await fetch(`${API_BASE}/auth/users/search?${query}`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) throw new Error("Failed to search users");
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
			const errorBody = (await response.json()) as ApiErrorResponse;
			return {
				error: true as const,
				message: errorBody.error?.message ?? "Registration failed",
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
		const session = await getAppSession();
		const { userId, user, createdAt } = session.data;

		if (
			user &&
			createdAt &&
			Date.now() - createdAt < USER_PROFILE_CACHE_TTL_MS
		) {
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
