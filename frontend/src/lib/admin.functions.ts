import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

const ADMIN_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

// ── Schemas ───────────────────────────────────────────────

const adminUsersQueryParamsSchema = z.object({
	page: z.number().optional(),
	pageSize: z.number().optional(),
	search: z.string().optional(),
	isActive: z.string().optional(),
});

const bulkUpdateStatusSchema = z.object({
	userIds: z.array(z.string()),
	isActive: z.boolean(),
});

const bulkApproveSchema = z.object({
	users: z.array(
		z.object({
			userId: z.string(),
			roleName: z.string(),
		}),
	),
});

const auditLogsParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
});

export interface AdminStats {
	totalAccounts: number;
	pendingApproval: number;
	deactivated: number;
}

export interface UserResponse {
	userId: string;
	firstName: string;
	middleName: string | null;
	lastName: string;
	nameSuffix: string | null;
	academicRank: string | null;
	email: string;
	roleName: string;
	campusName: string;
	departmentName: string | null;
	isActive: boolean;
	avatarUrl: string | null;
}

export interface UsersListResponse {
	users: UserResponse[];
	total: number;
	page: number;
	pageSize: number;
}

export interface AdminUsersQueryParams {
	page: number;
	pageSize: number;
	search?: string;
	isActive?: string;
}

export function adminStatsQueryOptions() {
	return queryOptions({
		queryKey: ["admin", "stats"],
		queryFn: () => getAdminStatsFn(),
		staleTime: ADMIN_QUERY_STALE_TIME_MS,
	});
}

export function adminUsersQueryOptions({
	page,
	pageSize,
	search,
	isActive,
}: AdminUsersQueryParams) {
	return queryOptions({
		queryKey: ["admin", "users", page, pageSize, search ?? "", isActive ?? ""],
		queryFn: () =>
			getAdminUsersFn({
				data: { page, pageSize, search, isActive },
			}),
		staleTime: ADMIN_QUERY_STALE_TIME_MS,
	});
}

// ── Get Admin Stats ──────────────────────────────────────

const getAdminStatsFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/admin/stats`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch admin stats",
			);
			throw new Error(message);
		}

		return (await response.json()) as AdminStats;
	});

// ── Get Admin Users ──────────────────────────────────────

export const getAdminUsersFn = createServerFn({ method: "GET" })
	.validator(adminUsersQueryParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const query = new URLSearchParams();
		if (data.search) query.append("search", data.search);
		if (data.isActive) query.append("isActive", data.isActive);
		if (data.page) query.append("page", data.page.toString());
		if (data.pageSize) query.append("pageSize", data.pageSize.toString());

		const response = await fetch(
			`${API_BASE}/admin/users?${query.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to fetch users");
			throw new Error(message);
		}

		return (await response.json()) as UsersListResponse;
	});

// ── Bulk Update User Status ──────────────────────────────

export const bulkUpdateUserStatusFn = createServerFn({ method: "POST" })
	.validator(bulkUpdateStatusSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/admin/users/status`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to update user status",
			);
			throw new Error(message);
		}

		return (await response.json()) as {
			success: boolean;
			updatedCount: number;
		};
	});

// ── Get Roles ────────────────────────────────────────────

export interface RoleResponse {
	roleId: number;
	roleName: string;
}

export const getRolesFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/admin/roles`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to fetch roles");
			throw new Error(message);
		}

		return (await response.json()) as RoleResponse[];
	});

// ── Bulk Approve Users ───────────────────────────────────

export const bulkApproveUsersFn = createServerFn({ method: "POST" })
	.validator(bulkApproveSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/admin/users/approve`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to bulk approve users",
			);
			throw new Error(message);
		}

		return (await response.json()) as {
			success: boolean;
			updatedCount: number;
		};
	});

// ── Audit Logs ───────────────────────────────────────────

export interface AuditLog {
	logId: string;
	userId: string;
	action: string;
	tableAffected: string;
	ipAddress: string | null;
	createdAt: string;
	actorName: string | null;
	actorRole: string | null;
}

export interface AuditLogListResponse {
	items: AuditLog[];
	total: number;
}

export interface AuditStats {
	totalActionsToday: number;
	uniqueUsersActive: number;
	accountChanges: number;
	failedLogins: number;
}

const getAuditLogsFn = createServerFn({ method: "GET" })
	.validator(auditLogsParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const query = new URLSearchParams();
		query.append("page", data.page.toString());
		query.append("limit", data.limit.toString());
		if (data.search) query.append("search", data.search);

		const response = await fetch(`${API_BASE}/audit-logs?${query.toString()}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch audit logs",
			);
			throw new Error(message);
		}

		return (await response.json()) as AuditLogListResponse;
	});

const getAuditStatsFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/audit-logs/stats`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch audit stats",
			);
			throw new Error(message);
		}

		return (await response.json()) as AuditStats;
	});

export function auditLogsQueryOptions(params: {
	page: number;
	limit: number;
	search?: string;
}) {
	return queryOptions({
		queryKey: ["admin", "audit-logs", params],
		queryFn: () => getAuditLogsFn({ data: params }),
		staleTime: 1000 * 30, // 30 seconds
		placeholderData: keepPreviousData,
	});
}

export function auditStatsQueryOptions() {
	return queryOptions({
		queryKey: ["admin", "audit-stats"],
		queryFn: () => getAuditStatsFn(),
		staleTime: 1000 * 60, // 1 minute
	});
}

// ── Provision Director ───────────────────────────────────

const provisionDirectorSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	middleName: z.string().optional().nullable(),
	lastName: z.string().min(1, "Last name is required"),
	nameSuffix: z.string().optional().nullable(),
	email: z.string().email("Invalid email address"),
	academicRank: z.string().min(1, "Academic rank is required"),
	departmentId: z.number().optional().nullable(),
});

export type ProvisionDirectorInput = z.infer<typeof provisionDirectorSchema>;

export const provisionDirectorFn = createServerFn({ method: "POST" })
	.validator(provisionDirectorSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/admin/users`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to provision Director account",
			);
			throw new Error(message);
		}

		return (await response.json()) as {
			success: boolean;
			userId: string;
			temporaryPassword: string;
		};
	});

// ── Update User ──────────────────────────────────────────

const updateUserSchema = z.object({
	userId: z.string(),
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

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const updateUserFn = createServerFn({ method: "POST" })
	.validator(updateUserSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Super Admin");
		const token = await getValidAccessToken();

		const { userId, ...body } = data;

		const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const message = await getErrorMessage(response, "Failed to update user");
			throw new Error(message);
		}

		return (await response.json()) as { success: boolean; userId: string };
	});
