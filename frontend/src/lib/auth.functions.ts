// ── Auth server functions (.functions.ts → safe to import on client) ──
// Per file-separation skill: .functions.ts files wrap server-only logic
// in createServerFn, so the build replaces them with RPC stubs on the client.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiErrorResponse, AuthUser } from "./auth";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";
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
		if (contentType?.includes("application/json")) {
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
		const [{ getAppSession }] = await Promise.all([import("./session.server")]);

		const response = await fetch(`${API_BASE}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as {
				error?: { message?: string };
			};
			const message = body?.error?.message ?? "Invalid email or password";
			return { error: true as const, message };
		}

		const { access_token, refresh_token, user } = (await response.json()) as {
			access_token: string;
			refresh_token: string;
			user: AuthUser;
		};

		const session = await getAppSession();
		await session.update({
			accessToken: access_token,
			refreshToken: refresh_token,
			userId: user.userId,
			email: user.email,
			user,
			createdAt: Date.now(),
		});

		return { error: false as const, user };
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
		const [{ authorizeSessionUser, getValidAccessToken }] = await Promise.all([
			import("./session.server"),
		]);
		// Require an authenticated user with any of our active roles
		const [_, accessToken] = await Promise.all([
			authorizeSessionUser("Faculty", "RET Chair", "Director", "Super Admin"),
			getValidAccessToken(),
		]);

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
	const { getAppSession, getValidAccessToken } = await import(
		"./session.server"
	);
	const session = await getAppSession();
	const accessToken = await getValidAccessToken().catch(() => null);

	if (accessToken) {
		await fetch(`${API_BASE}/auth/logout`, {
			method: "POST",
			headers: { Authorization: `Bearer ${accessToken}` },
		}).catch(() => {});
	}

	await session.clear();
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
		const [{ getAppSession, getValidAccessToken }, { supabase }] =
			await Promise.all([
				import("./session.server"),
				import("./supabase.server"),
			]);

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

// ── Password Reset Functions ──

export const sendResetCodeFn = createServerFn({ method: "POST" })
	.validator(z.object({ email: z.string().email() }))
	.handler(async ({ data }) => {
		const { supabase } = await import("./supabase.server");
		const { error } = await supabase.auth.resetPasswordForEmail(data.email);
		if (error) {
			return { error: true as const, message: error.message };
		}
		return { error: false as const };
	});

export const verifyResetCodeFn = createServerFn({ method: "POST" })
	.validator(
		z.object({ email: z.string().email(), code: z.string().length(6) }),
	)
	.handler(async ({ data }) => {
		const { supabase } = await import("./supabase.server");
		const { data: verifyData, error } = await supabase.auth.verifyOtp({
			email: data.email,
			token: data.code,
			type: "recovery",
		});
		if (error || !verifyData.session) {
			return {
				error: true as const,
				message: error?.message ?? "Invalid or expired code",
			};
		}

		const { getAppSession } = await import("./session.server");
		const session = await getAppSession();
		await session.update({
			accessToken: verifyData.session.access_token,
			refreshToken: verifyData.session.refresh_token,
			email: data.email,
		});
		return { error: false as const };
	});

export const setNewPasswordFn = createServerFn({ method: "POST" })
	.validator(z.object({ password: z.string().min(8) }))
	.handler(async ({ data }) => {
		const { getAppSession } = await import("./session.server");
		const session = await getAppSession();
		const { accessToken, refreshToken } = session.data;

		if (!accessToken || !refreshToken) {
			return {
				error: true as const,
				message: "Session expired or invalid. Please request a new code.",
			};
		}

		const { createClient } = await import("@supabase/supabase-js");
		const client = createClient(
			process.env.SUPABASE_URL ?? "",
			process.env.SUPABASE_ANON_KEY ?? "",
			{
				auth: { persistSession: false, autoRefreshToken: false },
			},
		);

		const { error: setSessionError } = await client.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken,
		});

		if (setSessionError) {
			return {
				error: true as const,
				message: `Auth session error: ${setSessionError.message}`,
			};
		}

		// Check if password has been compromised
		const breachResponse = await fetch(`${API_BASE}/auth/check-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ password: data.password }),
		});
		if (breachResponse.ok) {
			const { compromised } = (await breachResponse.json()) as {
				compromised: boolean;
			};
			if (compromised) {
				return {
					error: true as const,
					message:
						"This password has appeared in a known data breach. Please choose a different one.",
				};
			}
		}

		const { error: updateError } = await client.auth.updateUser({
			password: data.password,
		});

		if (updateError) {
			return { error: true as const, message: updateError.message };
		}

		await session.clear();
		return { error: false as const };
	});

// ── Complete Onboarding ──
export const completeOnboardingFn = createServerFn({ method: "POST" })
	.validator(z.void())
	.handler(async () => {
		const [{ getValidAccessToken, getAppSession }] = await Promise.all([
			import("./session.server"),
		]);

		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/auth/onboarding/complete`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to complete onboarding",
			);
			throw new Error(message);
		}

		// Update cached user session in memory/cookie
		const session = await getAppSession();
		if (session.data.user) {
			await session.update({
				user: {
					...session.data.user,
					hasCompletedOnboarding: true,
				},
			});
		}

		return (await response.json()) as { success: boolean };
	});
