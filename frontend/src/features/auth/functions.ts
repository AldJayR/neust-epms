// ── Auth server functions (.functions.ts → safe to import on client) ──
// Per file-separation skill: .functions.ts files wrap server-only logic
// in createServerFn, so the build replaces them with RPC stubs on the client.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import type { SearchUserResponse } from "@/types/search";
import type { AuthUser } from "@/types/user";

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
		const [{ getAppSession }, response] = await Promise.all([
			import("@/lib/session.server"),
			fetch(`${API_BASE}/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			}),
		]);

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
		await session.clear();
		await session.update({
			purpose: "app",
			accessToken: access_token,
			refreshToken: refresh_token,
			userId: user.userId,
			email: user.email,
			user,
			createdAt: Date.now(),
		});

		return { error: false as const, user };
	});

export const searchUsersFn = createServerFn({ method: "GET" })
	.validator(z.object({ search: z.string().min(1) }))
	.handler(async ({ data }) => {
		const [{ authorizeSessionUser, getValidAccessToken }] = await Promise.all([
			import("@/lib/session.server"),
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
		"@/lib/session.server"
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
		if (!response.ok)
			throw new Error("Unable to load departments. Please try again.");
		return (await response.json()) as LookupItem[];
	},
);

export const getCampusesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const response = await fetch(`${API_BASE}/auth/campuses`);
		if (!response.ok)
			throw new Error("Unable to load campuses. Please try again.");
		return (await response.json()) as LookupItem[];
	},
);

// ── Password breach check ──

export async function checkPasswordSafety(
	password: string,
): Promise<{ compromised: boolean }> {
	const response = await fetch(`${API_BASE}/auth/check-password`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password }),
	});

	if (!response.ok) {
		throw new Error("Unable to verify password safety");
	}

	return (await response.json()) as { compromised: boolean };
}

export const checkPasswordFn = createServerFn({ method: "POST" })
	.validator(z.object({ password: z.string().min(1) }))
	.handler(async ({ data }) => checkPasswordSafety(data.password));

// ── Get Current User ──────────────────────────────────────

export const getCurrentUserFn = createServerFn({ method: "POST" })
	.validator(z.void())
	.handler(async () => {
		const { getAppSession, getValidAccessToken, SessionExpiredError } =
			await import("@/lib/session.server");

		const session = await getAppSession();
		const { userId } = session.data;
		if (session.data.purpose === "recovery") return null;

		if (!userId) {
			return null;
		}

		let token: string;
		try {
			token = await getValidAccessToken();
		} catch (error) {
			if (error instanceof SessionExpiredError) return null;
			throw error;
		}

		// Validate the token is still valid by calling our backend
		let meResponse = await fetch(`${API_BASE}/auth/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (meResponse.status === 401) {
			try {
				token = await getValidAccessToken(true);
			} catch (error) {
				if (error instanceof SessionExpiredError) return null;
				throw error;
			}
			meResponse = await fetch(`${API_BASE}/auth/me`, {
				headers: { Authorization: `Bearer ${token}` },
			});
		}
		if (meResponse.status === 401 || meResponse.status === 403) {
			await session.clear();
			return null;
		}
		if (!meResponse.ok)
			throw new Error("Unable to load your account. Please try again.");

		const currentUser = (await meResponse.json()) as AuthUser;
		if (!currentUser.isActive || currentUser.userId !== userId) {
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

const profileSchema = z.object({
	firstName: z.string().min(1),
	middleName: z.string().nullable(),
	lastName: z.string().min(1),
	nameSuffix: z.string().nullable(),
	academicRank: z.string().nullable(),
});

export const updateProfileFn = createServerFn({ method: "POST" })
	.validator(profileSchema)
	.handler(async ({ data }) => {
		const [{ getAppSession, getValidAccessToken }, { authorizeSessionUser }] =
			await Promise.all([
				import("@/lib/session.server"),
				import("@/lib/session.server"),
			]);
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/auth/profile`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(response, "Unable to update profile"),
			);
		const user = (await response.json()) as AuthUser;
		const session = await getAppSession();
		await session.update({
			...session.data,
			user,
			email: user.email,
			createdAt: Date.now(),
		});
		return user;
	});

export const changePasswordFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			currentPassword: z.string().min(1),
			newPassword: z.string().min(8),
		}),
	)
	.handler(async ({ data }) => {
		const [{ getValidAccessToken }, { authorizeSessionUser }] =
			await Promise.all([
				import("@/lib/session.server"),
				import("@/lib/session.server"),
			]);
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/auth/change-password`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(response, "Unable to change password"),
			);
	});

// ── Password Reset Functions ──

export const sendResetCodeFn = createServerFn({ method: "POST" })
	.validator(z.object({ email: z.email() }))
	.handler(async ({ data }) => {
		const { supabase } = await import("@/lib/supabase.server");
		const { error } = await supabase.auth.resetPasswordForEmail(data.email);
		if (error) {
			return { error: true as const, message: error.message };
		}
		return { error: false as const };
	});

export const verifyResetCodeFn = createServerFn({ method: "POST" })
	.validator(z.object({ email: z.email(), code: z.string().length(6) }))
	.handler(async ({ data }) => {
		const { getAppSession } = await import("@/lib/session.server");
		const session = await getAppSession();
		await session.clear();
		const { createClient } = await import("@supabase/supabase-js");
		const client = createClient(
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
		const { data: verifyData, error } = await client.auth.verifyOtp({
			email: data.email,
			token: data.code,
			type: "recovery",
		});
		if (
			error ||
			!verifyData.session ||
			!verifyData.user ||
			verifyData.session.user.id !== verifyData.user.id
		) {
			return {
				error: true as const,
				message: error?.message ?? "Invalid or expired code",
			};
		}

		await session.update({
			purpose: "recovery",
			recoveryUserId: verifyData.user.id,
			recoveryVerifiedAt: Date.now(),
			accessToken: verifyData.session.access_token,
			refreshToken: verifyData.session.refresh_token,
			email: verifyData.user.email,
		});
		return { error: false as const };
	});

export const setNewPasswordFn = createServerFn({ method: "POST" })
	.validator(z.object({ password: z.string().min(8) }))
	.handler(async ({ data }) => {
		const { getAppSession, isRecoverySession } = await import(
			"@/lib/session.server"
		);
		const session = await getAppSession();
		const { accessToken, refreshToken } = session.data;

		if (!isRecoverySession(session.data) || !accessToken || !refreshToken) {
			return {
				error: true as const,
				message:
					"We couldn't continue your password reset. Request a new code.",
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

		const { data: restored, error: setSessionError } =
			await client.auth.setSession({
				access_token: accessToken,
				refresh_token: refreshToken,
			});

		const { data: identity, error: identityError } =
			await client.auth.getUser();
		if (
			setSessionError ||
			identityError ||
			!restored.user ||
			identity.user?.id !== session.data.recoveryUserId ||
			restored.user.id !== session.data.recoveryUserId
		) {
			console.error(
				"[auth] Password reset session could not be restored:",
				setSessionError ?? identityError,
			);
			return {
				error: true as const,
				message:
					"We couldn't continue your password reset. Request a new code.",
			};
		}

		try {
			const { compromised } = await checkPasswordSafety(data.password);
			if (compromised) {
				return {
					error: true as const,
					message:
						"This password has appeared in a known data breach. Please choose a different one.",
				};
			}
		} catch {
			return {
				error: true as const,
				message: "Unable to verify password safety. Please try again.",
			};
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

export const resetPasswordWithTokenFn = createServerFn({ method: "POST" })
	.validator(
		z.object({ token: z.string().min(1), password: z.string().min(8) }),
	)
	.handler(async ({ data }) => {
		const response = await fetch(`${API_BASE}/auth/reset-password`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: data.token,
				newPassword: data.password,
			}),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Unable to reset your password",
			);
			return { error: true as const, message };
		}

		return { error: false as const };
	});

// ── Complete Onboarding ──
export const completeOnboardingFn = createServerFn({ method: "POST" })
	.validator(z.void())
	.handler(async () => {
		const [{ getValidAccessToken, getAppSession }] = await Promise.all([
			import("@/lib/session.server"),
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

export type { SearchUserResponse } from "@/types/search";
