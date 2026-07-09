import { z } from "@hono/zod-openapi";

export const UserResponseSchema = z
	.object({
		userId: z.string(),
		firstName: z.string(),
		middleName: z.string().nullable(),
		lastName: z.string(),
		nameSuffix: z.string().nullable(),
		academicRank: z.string().nullable(),
		email: z.string().email(),
		roleName: z.string(),
		campusName: z.string(),
		departmentName: z.string().nullable(),
		isActive: z.boolean(),
		avatarUrl: z.string().nullable(),
		hasCompletedOnboarding: z.boolean(),
	})
	.openapi("UserResponse");

export const UsersListResponseSchema = z.object({
	users: z.array(UserResponseSchema),
	total: z.number(),
	page: z.number(),
	pageSize: z.number(),
});

export const AdminStatsResponseSchema = z.object({
	totalAccounts: z.number(),
	pendingApproval: z.number(),
	deactivated: z.number(),
});

export const BulkUpdateStatusSchema = z.object({
	userIds: z.array(z.string()),
	isActive: z.boolean(),
});

export const BulkActionResponseSchema = z.object({
	success: z.boolean(),
	updatedCount: z.number(),
});

export const RoleSchema = z.object({
	roleId: z.number(),
	roleName: z.string(),
});

export const RolesResponseSchema = z.array(RoleSchema);

export const BulkApproveSchema = z.object({
	users: z.array(
		z.object({
			userId: z.string(),
			roleName: z.string(),
		}),
	),
});

export const AdminParamId = z.object({
	id: z.string().openapi({
		param: {
			name: "id",
			in: "path",
		},
		type: "string",
		example: "123e4567-e89b-12d3-a456-426614174000",
	}),
});

export const RejectUserSchema = z
	.object({
		reason: z.string().optional(),
	})
	.openapi("RejectUser");

export const RejectUserResponseSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
});

export const ProvisionDirectorSchema = z.object({
	firstName: z.string().min(1),
	middleName: z.string().optional().nullable(),
	lastName: z.string().min(1),
	nameSuffix: z.string().optional().nullable(),
	email: z.string().email(),
	academicRank: z.string().min(1),
	departmentId: z.number().optional().nullable(),
});

export const ProvisionDirectorResponseSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
	temporaryPassword: z.string(),
});

export const UpdateUserSchema = z.object({
	firstName: z.string().min(1).optional(),
	middleName: z.string().optional().nullable(),
	lastName: z.string().min(1).optional(),
	nameSuffix: z.string().optional().nullable(),
	academicRank: z.string().optional().nullable(),
	campusId: z.number().optional(),
	departmentId: z.number().optional().nullable(),
	roleId: z.number().optional(),
	isActive: z.boolean().optional(),
});

export const UpdateUserResponseSchema = z.object({
	success: z.boolean(),
	userId: z.string(),
});

export const AdminUsersQuerySchema = z.object({
	search: z.string().optional(),
	isActive: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
