import type { z } from "@hono/zod-openapi";
import { and, eq, gt, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { passwordResetTokens } from "@/db/schema/password-reset-tokens.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { isPasswordCompromised } from "@/lib/password-check.js";
import { hashResetToken } from "@/lib/reset-token.js";
import { createUserAuthClient, supabase } from "@/lib/supabase.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import type {
	ChangePasswordBodySchema,
	LoginBodySchema,
	RegisterUserBodySchema,
	UpdateProfileBodySchema,
	UserSearchQuerySchema,
} from "./auth.schema.js";

type RegisterUserBody = z.infer<typeof RegisterUserBodySchema>;
type LoginBody = z.infer<typeof LoginBodySchema>;
type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;

export async function updateOwnProfile(
	user: AuthUser,
	body: z.infer<typeof UpdateProfileBodySchema>,
	ipAddress: string,
) {
	await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(users)
			.set({ ...body, updatedAt: new Date() })
			.where(and(eq(users.userId, user.userId), isNull(users.archivedAt)))
			.returning();
		if (!updated)
			throw new ApiError(404, "NOT_FOUND", "User profile not found");
		await insertAuditLog(
			{
				userId: user.userId,
				action: "Updated own profile",
				tableAffected: "users",
				ipAddress,
			},
			tx,
		);
	});
	const profile = await getUserProfileById(user.userId);
	if (!profile) throw new ApiError(404, "NOT_FOUND", "User profile not found");
	return profile;
}

export async function changeOwnPassword(
	user: AuthUser,
	body: z.infer<typeof ChangePasswordBodySchema>,
	ipAddress: string,
) {
	const compromised = await isPasswordCompromised(body.newPassword);
	if (compromised)
		throw new ApiError(
			400,
			"COMPROMISED_PASSWORD",
			"Choose a password that has not appeared in a known data breach.",
		);
	const { error: verifyError } =
		await createUserAuthClient().auth.signInWithPassword({
			email: user.email,
			password: body.currentPassword,
		});
	if (verifyError)
		throw new ApiError(
			400,
			"INVALID_PASSWORD",
			"Your current password is incorrect.",
		);
	try {
		const { error } = await supabase.auth.admin.updateUserById(user.userId, {
			password: body.newPassword,
		});
		if (error) throw new ApiError(400, "PASSWORD_UPDATE_FAILED", error.message);
	} catch (error) {
		await auditExternalAuthOperation(
			user.userId,
			"Change own password failed",
			ipAddress,
		);
		throw error;
	}
	await auditExternalAuthOperation(
		user.userId,
		"Changed own password",
		ipAddress,
	);
	return { success: true };
}

async function getUserProfileById(userId: string) {
	const [row] = await db
		.select({
			userId: users.userId,
			firstName: users.firstName,
			middleName: users.middleName,
			lastName: users.lastName,
			nameSuffix: users.nameSuffix,
			academicRank: users.academicRank,
			email: users.email,
			avatarUrl: users.avatarUrl,
			roleId: users.roleId,
			roleName: roles.roleName,
			campusId: users.campusId,
			campusName: campuses.campusName,
			isMainCampus: campuses.isMainCampus,
			departmentId: users.departmentId,
			departmentName: departments.departmentName,
			isActive: users.isActive,
			hasCompletedOnboarding: users.hasCompletedOnboarding,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.innerJoin(campuses, eq(users.campusId, campuses.campusId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.where(and(eq(users.userId, userId), isNull(users.archivedAt)))
		.limit(1);

	return row;
}

export async function checkPassword(password: string): Promise<boolean> {
	return isPasswordCompromised(password);
}

export async function resetPasswordWithToken(
	token: string,
	newPassword: string,
	ipAddress: string,
): Promise<{ success: true }> {
	const [existing] = await db
		.select({
			tokenId: passwordResetTokens.id,
			userId: passwordResetTokens.userId,
			expiresAt: passwordResetTokens.expiresAt,
		})
		.from(passwordResetTokens)
		.where(
			and(
				eq(passwordResetTokens.tokenHash, hashResetToken(token)),
				isNull(passwordResetTokens.usedAt),
			),
		)
		.limit(1);

	if (!existing) {
		throw new ApiError(
			400,
			"INVALID_RESET_TOKEN",
			"This reset link is invalid or has already been used.",
		);
	}

	if (existing.expiresAt.getTime() < Date.now()) {
		throw new ApiError(
			400,
			"RESET_TOKEN_EXPIRED",
			"This reset link has expired. Ask an administrator for a new one.",
		);
	}

	const compromised = await isPasswordCompromised(newPassword);
	if (compromised) {
		throw new ApiError(
			400,
			"COMPROMISED_PASSWORD",
			"Choose a password that has not appeared in a known data breach.",
		);
	}

	// Claim once before the external operation. Never release the claim on an
	// uncertain provider outcome: retry requires a newly issued reset link.
	const [claimed] = await db
		.update(passwordResetTokens)
		.set({ usedAt: new Date() })
		.where(
			and(
				eq(passwordResetTokens.id, existing.tokenId),
				isNull(passwordResetTokens.usedAt),
				gt(passwordResetTokens.expiresAt, new Date()),
			),
		)
		.returning({ userId: passwordResetTokens.userId });
	if (!claimed)
		throw new ApiError(
			400,
			"INVALID_RESET_TOKEN",
			"This reset link is invalid or has already been used.",
		);

	try {
		const { error } = await supabase.auth.admin.updateUserById(claimed.userId, {
			password: newPassword,
		});
		if (error) throw new ApiError(400, "PASSWORD_UPDATE_FAILED", error.message);
	} catch (error) {
		await auditExternalAuthOperation(
			claimed.userId,
			"Password reset via admin-generated link failed (token consumed)",
			ipAddress,
		);
		throw error;
	}
	await auditExternalAuthOperation(
		claimed.userId,
		"Password reset via admin-generated link",
		ipAddress,
	);

	return { success: true };
}

export async function registerUser(body: RegisterUserBody, ipAddress: string) {
	const [[existing], [duplicateName], compromised, [facultyRole]] =
		await Promise.all([
			db
				.select({ userId: users.userId })
				.from(users)
				.where(eq(users.email, body.email))
				.limit(1),
			db
				.select({ userId: users.userId })
				.from(users)
				.where(
					and(
						ilike(users.firstName, body.firstName.trim()),
						ilike(users.lastName, body.lastName.trim()),
					),
				)
				.limit(1),
			isPasswordCompromised(body.password),
			db
				.select({ roleId: roles.roleId })
				.from(roles)
				.where(eq(roles.roleName, ROLE_NAMES.FACULTY))
				.limit(1),
		]);

	if (existing) {
		throw new ApiError(400, "USER_EXISTS", "Email already registered");
	}

	if (duplicateName) {
		throw new ApiError(
			400,
			"DUPLICATE_PROFILE",
			"A user with this name is already registered in the system. Duplicate accounts are not permitted.",
		);
	}

	if (compromised) {
		throw new ApiError(
			400,
			"COMPROMISED_PASSWORD",
			"This password has appeared in a known data breach. Please choose a different one.",
		);
	}

	if (!facultyRole) {
		throw new ApiError(500, "CONFIG_ERROR", "Faculty role not found in system");
	}

	const { data: authData, error: authError } =
		await supabase.auth.admin.createUser({
			email: body.email,
			password: body.password,
			email_confirm: true,
		});

	if (authError || !authData.user) {
		throw new ApiError(
			400,
			"AUTH_ERROR",
			authError?.message ?? "Failed to create auth user",
		);
	}

	let created: { userId: string } | undefined;
	try {
		created = await db.transaction(async (tx) => {
			const [userRow] = await tx
				.insert(users)
				.values({
					userId: authData.user.id,
					firstName: body.firstName,
					middleName: body.middleName ?? null,
					lastName: body.lastName,
					nameSuffix: body.nameSuffix ?? null,
					academicRank: body.academicRank ?? null,
					email: body.email,
					roleId: facultyRole.roleId,
					campusId: body.campusId,
					departmentId: body.departmentId ?? null,
					isActive: false,
				})
				.returning();

			if (!userRow) {
				throw new Error("INSERT_FAILED");
			}

			await insertAuditLog(
				{
					userId: userRow.userId,
					action: "Self-registered account",
					tableAffected: "users",
					ipAddress,
				},
				tx,
			);

			return userRow;
		});
	} catch (_err) {
		await supabase.auth.admin.deleteUser(authData.user.id);
		throw new ApiError(500, "INSERT_FAILED", "Failed to create user record");
	}

	if (!created) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create user record");
	}

	const row = await getUserProfileById(created.userId);

	if (!row) {
		throw new ApiError(
			500,
			"REGISTRATION_FAILED",
			"User created but profile could not be loaded",
		);
	}

	return row;
}

export async function listDepartments() {
	const rows = await db
		.select({
			departmentId: departments.departmentId,
			departmentName: departments.departmentName,
		})
		.from(departments)
		.orderBy(departments.departmentName);

	return rows.map((r) => ({ id: r.departmentId, name: r.departmentName }));
}

export async function listCampuses() {
	const rows = await db
		.select({
			campusId: campuses.campusId,
			campusName: campuses.campusName,
		})
		.from(campuses)
		.orderBy(campuses.campusName);

	return rows.map((r) => ({ id: r.campusId, name: r.campusName }));
}

export async function searchUsers(search: UserSearchQuery["search"]) {
	return db
		.select({
			userId: users.userId,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
		})
		.from(users)
		.where(
			or(
				ilike(users.firstName, `%${search}%`),
				ilike(users.lastName, `%${search}%`),
				ilike(users.email, `%${search}%`),
			),
		)
		.limit(10);
}

export async function login(body: LoginBody, ipAddress: string) {
	const { data: authData, error: authError } =
		await createUserAuthClient().auth.signInWithPassword(body);

	if (authError || !authData.session) {
		throw new ApiError(401, "LOGIN_FAILED", "Invalid email or password");
	}

	const appUser = await getUserProfileById(authData.user.id);

	if (!appUser) {
		throw new ApiError(401, "USER_NOT_FOUND", "User profile not found");
	}

	if (!appUser.isActive) {
		insertAuditLog({
			userId: appUser.userId,
			action: "Failed Login",
			tableAffected: "users",
			ipAddress,
		}).catch((err) => {
			console.error("Failed to write failed login audit log:", err);
		});
		throw new ApiError(
			403,
			"ACCOUNT_INACTIVE",
			"Your account has not been activated. Contact an administrator.",
		);
	}

	insertAuditLog({
		userId: appUser.userId,
		action: "Login",
		tableAffected: "users",
		ipAddress,
	}).catch((err) => {
		console.error("Failed to write login audit log:", err);
	});

	return {
		access_token: authData.session.access_token,
		refresh_token: authData.session.refresh_token,
		user: appUser,
	};
}

export async function logout(
	authUser: AuthUser,
	bearerToken: string | undefined,
	ipAddress: string,
): Promise<{ ok: true }> {
	if (!bearerToken)
		throw new ApiError(401, "MISSING_TOKEN", "Logout requires a bearer token");
	try {
		const { error } = await supabase.auth.admin.signOut(bearerToken);
		if (error)
			throw new ApiError(503, "LOGOUT_FAILED", "Unable to revoke the session");
	} catch (error) {
		await auditExternalAuthOperation(
			authUser.userId,
			"Logout failed",
			ipAddress,
		);
		throw error;
	}
	await auditExternalAuthOperation(authUser.userId, "Logout", ipAddress);

	return { ok: true };
}

export async function completeOnboarding(
	userId: string,
): Promise<{ success: true }> {
	await db
		.update(users)
		.set({ hasCompletedOnboarding: true })
		.where(eq(users.userId, userId));

	return { success: true };
}

async function auditExternalAuthOperation(
	userId: string,
	action: string,
	ipAddress: string,
) {
	await insertAuditLog({
		userId,
		action,
		tableAffected: "users",
		ipAddress,
	}).catch((error) => {
		console.error("Failed to audit external auth operation:", {
			userId,
			action,
			error,
		});
	});
}
