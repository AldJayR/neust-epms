import type { z } from "@hono/zod-openapi";
import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { authUserCache, cacheEnabled } from "@/lib/cache.js";
import { ApiError } from "@/lib/errors.js";
import { isPasswordCompromised } from "@/lib/password-check.js";
import { supabase } from "@/lib/supabase.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import type {
	LoginBodySchema,
	RegisterUserBodySchema,
	UserSearchQuerySchema,
} from "./auth.schema.js";

type RegisterUserBody = z.infer<typeof RegisterUserBodySchema>;
type LoginBody = z.infer<typeof LoginBodySchema>;
type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;

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
		.where(eq(users.userId, userId))
		.limit(1);

	return row;
}

export async function checkPassword(password: string): Promise<boolean> {
	return isPasswordCompromised(password);
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
		await supabase.auth.signInWithPassword(body);

	if (authError || !authData.session) {
		throw new ApiError(401, "LOGIN_FAILED", "Invalid email or password");
	}

	let appUser: AuthUser | undefined;
	if (cacheEnabled) {
		appUser = authUserCache.get(`auth:user:${authData.user.id}`);
	}

	if (!appUser) {
		appUser = await getUserProfileById(authData.user.id);
		if (appUser && cacheEnabled) {
			authUserCache.set(`auth:user:${authData.user.id}`, appUser);
		}
	}

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
	await Promise.all([
		insertAuditLog({
			userId: authUser.userId,
			action: "Logout",
			tableAffected: "users",
			ipAddress,
		}).catch((err) => {
			console.error("Failed to write logout audit log:", err);
		}),
		bearerToken ? supabase.auth.admin.signOut(bearerToken) : Promise.resolve(),
	]);

	return { ok: true };
}

export async function completeOnboarding(
	userId: string,
): Promise<{ success: true }> {
	await db
		.update(users)
		.set({ hasCompletedOnboarding: true })
		.where(eq(users.userId, userId));

	if (cacheEnabled) {
		authUserCache.delete(`auth:user:${userId}`);
	}

	return { success: true };
}
