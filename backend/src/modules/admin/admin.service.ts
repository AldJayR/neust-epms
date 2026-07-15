import type { z } from "@hono/zod-openapi";
import { and, count, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client.js";
import { campuses } from "@/db/schema/campuses.js";
import { departments } from "@/db/schema/departments.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { captureAuditDiff } from "@/lib/audit-diff.js";
import { invalidateAuthUserCache } from "@/lib/cache.js";
import { ApiError } from "@/lib/errors.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { supabase } from "@/lib/supabase.js";
import { type AuthUser, ROLE_NAMES } from "@/lib/types.js";
import type {
	AdminUsersQuerySchema,
	BulkApproveSchema,
	BulkUpdateStatusSchema,
	ProvisionDirectorSchema,
	RejectUserSchema,
	UpdateUserSchema,
} from "./admin.schema.js";

type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;
type BulkUpdateStatusBody = z.infer<typeof BulkUpdateStatusSchema>;
type BulkApproveBody = z.infer<typeof BulkApproveSchema>;
type RejectUserBody = z.infer<typeof RejectUserSchema>;
type ProvisionDirectorBody = z.infer<typeof ProvisionDirectorSchema>;
type UpdateUserBody = z.infer<typeof UpdateUserSchema>;

export async function getAdminStats() {
	const allUsersCount = await db.select({ value: count() }).from(users);
	const deactivatedCount = await db
		.select({ value: count() })
		.from(users)
		.where(eq(users.isActive, false));

	const [pendingResult] = await db
		.select({ value: count() })
		.from(users)
		.where(eq(users.isActive, false));

	return {
		totalAccounts: Number(allUsersCount[0]?.value ?? 0),
		pendingApproval: Number(pendingResult?.value ?? 0),
		deactivated: Number(deactivatedCount[0]?.value ?? 0),
	};
}

export async function listUsers(query: AdminUsersQuery) {
	const { search, isActive, page, pageSize } = query;
	const offset = (page - 1) * pageSize;

	let searchClause: SQL | undefined;
	if (search) {
		searchClause = or(
			ilike(users.firstName, `${search}%`),
			ilike(users.lastName, `${search}%`),
			ilike(users.email, `${search}%`),
		);
	}

	let activeClause: SQL | undefined;
	if (isActive === "true") {
		activeClause = eq(users.isActive, true);
	} else if (isActive === "false") {
		activeClause = eq(users.isActive, false);
	}

	const finalWhere = and(searchClause, activeClause);

	const totalResult = await db
		.select({ value: count() })
		.from(users)
		.where(finalWhere);
	const rows = await db
		.select({
			userId: users.userId,
			firstName: users.firstName,
			middleName: users.middleName,
			lastName: users.lastName,
			nameSuffix: users.nameSuffix,
			academicRank: users.academicRank,
			email: users.email,
			roleName: roles.roleName,
			campusName: campuses.campusName,
			departmentName: departments.departmentName,
			isActive: users.isActive,
			avatarUrl: users.avatarUrl,
			hasCompletedOnboarding: users.hasCompletedOnboarding,
		})
		.from(users)
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.innerJoin(campuses, eq(users.campusId, campuses.campusId))
		.leftJoin(departments, eq(users.departmentId, departments.departmentId))
		.where(finalWhere)
		.limit(pageSize)
		.offset(offset);

	return {
		users: rows,
		total: Number(totalResult[0]?.value ?? 0),
		page,
		pageSize,
	};
}

export async function bulkUpdateUserStatus(
	authUser: AuthUser,
	body: BulkUpdateStatusBody,
	ipAddress: string,
) {
	const { userIds, isActive } = body;

	if (isActive === false && userIds.includes(authUser.userId)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You cannot deactivate your own account",
		);
	}

	if (userIds.length === 0) {
		return { success: true, updatedCount: 0 };
	}

	const result = await db
		.update(users)
		.set({ isActive, updatedAt: new Date() })
		.where(inArray(users.userId, userIds))
		.returning({ userId: users.userId });

	if (result.length > 0) {
		invalidateAuthUserCache(result.map((r) => r.userId));
	}

	await insertAuditLog({
		userId: authUser.userId,
		action: `Bulk updated status of ${result.length} users to ${isActive ? "Active" : "Inactive"}`,
		tableAffected: "users",
		ipAddress,
	});

	return { success: true, updatedCount: result.length };
}

export async function listRoles() {
	return db
		.select({ roleId: roles.roleId, roleName: roles.roleName })
		.from(roles);
}

export async function bulkApproveUsers(
	authUser: AuthUser,
	body: BulkApproveBody,
	ipAddress: string,
) {
	const usersToApprove = body.users;

	if (usersToApprove.length === 0) {
		return { success: true, updatedCount: 0 };
	}

	const allRoles = await db.select().from(roles);
	const roleMap = new Map(allRoles.map((r) => [r.roleName, r.roleId]));
	let updatedCount = 0;

	await db.transaction(async (tx) => {
		for (const u of usersToApprove) {
			const roleId = roleMap.get(u.roleName);
			if (!roleId) continue;
			const result = await tx
				.update(users)
				.set({ isActive: true, roleId, updatedAt: new Date() })
				.where(eq(users.userId, u.userId))
				.returning({ userId: users.userId });
			if (result.length > 0) updatedCount++;
		}

		if (updatedCount > 0) {
			await insertAuditLog(
				{
					userId: authUser.userId,
					action: `Bulk approved ${updatedCount} users with assigned roles`,
					tableAffected: "users",
					ipAddress,
				},
				tx,
			);
		}
	});

	if (updatedCount > 0) {
		invalidateAuthUserCache(usersToApprove.map((u) => u.userId));
	}

	for (const u of usersToApprove) {
		await createNotification({
			recipientId: u.userId,
			type: "system",
			title: "Account Activated",
			message: "Your account has been approved and activated.",
		}).catch((err) => {
			console.error(
				"[notification] Failed to send activation notification:",
				err,
			);
		});
	}

	return { success: true, updatedCount };
}

export async function rejectUser(
	authUser: AuthUser,
	id: string,
	body: RejectUserBody,
	ipAddress: string,
) {
	const [existing] = await db
		.select({ userId: users.userId, isActive: users.isActive })
		.from(users)
		.where(eq(users.userId, id))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "User not found");
	}

	if (existing.isActive) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Cannot reject an already active user",
		);
	}

	await db
		.update(users)
		.set({ archivedAt: new Date(), updatedAt: new Date() })
		.where(eq(users.userId, id));

	await insertAuditLog({
		userId: authUser.userId,
		action: `Rejected user ${id}${body.reason ? `: ${body.reason}` : ""}`,
		tableAffected: "users",
		ipAddress,
	});

	return { success: true, userId: id };
}

export async function provisionDirector(
	authUser: AuthUser,
	body: ProvisionDirectorBody,
	ipAddress: string,
) {
	if (authUser.roleName !== "Super Admin") {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only Super Admin can provision accounts",
		);
	}

	const [existing] = await db
		.select({ userId: users.userId })
		.from(users)
		.where(eq(users.email, body.email))
		.limit(1);

	if (existing) {
		throw new ApiError(400, "USER_EXISTS", "Email already registered");
	}

	const [duplicateName] = await db
		.select({ userId: users.userId })
		.from(users)
		.where(
			and(
				ilike(users.firstName, body.firstName.trim()),
				ilike(users.lastName, body.lastName.trim()),
			),
		)
		.limit(1);

	if (duplicateName) {
		throw new ApiError(
			400,
			"DUPLICATE_PROFILE",
			"A user with this name is already registered in the system. Duplicate accounts are not permitted.",
		);
	}

	const [directorRole] = await db
		.select({ roleId: roles.roleId })
		.from(roles)
		.where(eq(roles.roleName, ROLE_NAMES.DIRECTOR))
		.limit(1);

	if (!directorRole) {
		throw new ApiError(
			500,
			"CONFIG_ERROR",
			"Director role not found in system",
		);
	}

	const [mainCampus] = await db
		.select({ campusId: campuses.campusId })
		.from(campuses)
		.where(eq(campuses.isMainCampus, true))
		.limit(1);

	let campusId = mainCampus?.campusId;
	if (!campusId) {
		const [anyCampus] = await db
			.select({ campusId: campuses.campusId })
			.from(campuses)
			.limit(1);
		campusId = anyCampus?.campusId;
	}

	if (!campusId) {
		throw new ApiError(500, "CONFIG_ERROR", "No campus found in system");
	}

	const tempPassword = `Temp-${Math.random().toString(36).slice(-8)}${Math.floor(Math.random() * 10)}`;

	const { data: authData, error: authError } =
		await supabase.auth.admin.createUser({
			email: body.email,
			password: tempPassword,
			email_confirm: true,
		});

	if (authError || !authData.user) {
		throw new ApiError(
			400,
			"AUTH_ERROR",
			authError?.message ?? "Failed to create auth user",
		);
	}

	try {
		await db.transaction(async (tx) => {
			await tx.insert(users).values({
				userId: authData.user.id,
				firstName: body.firstName,
				middleName: body.middleName ?? null,
				lastName: body.lastName,
				nameSuffix: body.nameSuffix ?? null,
				academicRank: body.academicRank,
				email: body.email,
				roleId: directorRole.roleId,
				campusId: campusId,
				departmentId: body.departmentId ?? null,
				isActive: true,
			});

			await insertAuditLog(
				{
					userId: authUser.userId,
					action: `Provisioned Director account for ${body.email}`,
					tableAffected: "users",
					ipAddress,
				},
				tx,
			);
		});
	} catch (error) {
		await supabase.auth.admin
			.deleteUser(authData.user.id)
			.catch(() => undefined);
		throw error;
	}

	return {
		success: true,
		userId: authData.user.id,
		temporaryPassword: tempPassword,
	};
}

export async function updateUser(
	authUser: AuthUser,
	id: string,
	body: UpdateUserBody,
	ipAddress: string,
) {
	if (authUser.roleName !== "Super Admin") {
		throw new ApiError(403, "FORBIDDEN", "Only Super Admin can update users");
	}

	const [existing] = await db
		.select()
		.from(users)
		.where(eq(users.userId, id))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "User not found");
	}

	const updateFields: Partial<typeof users.$inferInsert> = {
		updatedAt: new Date(),
	};

	if (body.firstName !== undefined) updateFields.firstName = body.firstName;
	if (body.middleName !== undefined) updateFields.middleName = body.middleName;
	if (body.lastName !== undefined) updateFields.lastName = body.lastName;
	if (body.nameSuffix !== undefined) updateFields.nameSuffix = body.nameSuffix;
	if (body.academicRank !== undefined)
		updateFields.academicRank = body.academicRank;
	if (body.campusId !== undefined) updateFields.campusId = body.campusId;
	if (body.departmentId !== undefined)
		updateFields.departmentId = body.departmentId;
	if (body.roleId !== undefined) updateFields.roleId = body.roleId;
	if (body.isActive !== undefined) updateFields.isActive = body.isActive;

	const updated = {
		...existing,
		...updateFields,
	};

	const diff = captureAuditDiff(
		existing as unknown as Record<string, unknown>,
		updated as unknown as Record<string, unknown>,
		[
			"firstName",
			"lastName",
			"email",
			"roleId",
			"isActive",
			"campusId",
			"departmentId",
		],
	);

	await db.transaction(async (tx) => {
		await tx.update(users).set(updateFields).where(eq(users.userId, id));

		await insertAuditLog(
			{
				userId: authUser.userId,
				action: `Updated profile details for user ${id}`,
				tableAffected: "users",
				oldValue: diff.oldValue,
				newValue: diff.newValue,
				ipAddress,
			},
			tx,
		);
	});

	invalidateAuthUserCache([id]);

	return { success: true, userId: id };
}
