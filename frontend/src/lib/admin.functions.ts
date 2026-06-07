import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ApiErrorResponse } from "./auth";
import { useAppSession } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const ADMIN_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

// ── Schemas ───────────────────────────────────────────────

const adminUsersQueryParamsSchema = z.object({
	cursor: z.string().optional(),
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
	cursor: z.string().optional(),
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
}

export interface UsersListResponse {
	users: UserResponse[];
	total: number;
	nextCursor: string | null;
}

export interface AdminUsersQueryParams {
	cursor?: string;
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
	cursor,
	search,
	isActive,
}: AdminUsersQueryParams) {
	return queryOptions({
		queryKey: ["admin", "users", { cursor, search, isActive }],
		queryFn: () =>
			getAdminUsersFn({
				data: { cursor, search, isActive },
			}),
		staleTime: ADMIN_QUERY_STALE_TIME_MS,
	});
}

// ── Get Admin Stats ──────────────────────────────────────

export const getAdminStatsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/admin/stats`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(
				errorBody.error?.message ?? "Failed to fetch admin stats",
			);
		}

		return (await response.json()) as AdminStats;
	},
);

// ── Get Admin Users ──────────────────────────────────────

export const getAdminUsersFn = createServerFn({ method: "GET" })
	.inputValidator(adminUsersQueryParamsSchema)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const query = new URLSearchParams();
		query.append("limit", "50");
		if (data.cursor) query.append("cursor", data.cursor);
		if (data.search) query.append("search", data.search);
		if (data.isActive) query.append("isActive", data.isActive);

		const response = await fetch(
			`${API_BASE}/admin/users?${query.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch users");
		}

		return (await response.json()) as UsersListResponse;
	});

// ── Bulk Update User Status ──────────────────────────────

export const bulkUpdateUserStatusFn = createServerFn({ method: "POST" })
	.inputValidator(bulkUpdateStatusSchema)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/admin/users/status`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(
				errorBody.error?.message ?? "Failed to update user status",
			);
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

export const getRolesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/admin/roles`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch roles");
		}

		return (await response.json()) as RoleResponse[];
	},
);

export function rolesQueryOptions() {
	return queryOptions({
		queryKey: ["admin", "roles"],
		queryFn: () => getRolesFn(),
		staleTime: ADMIN_QUERY_STALE_TIME_MS,
	});
}

// ── Bulk Approve Users ───────────────────────────────────

export const bulkApproveUsersFn = createServerFn({ method: "POST" })
	.inputValidator(bulkApproveSchema)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/admin/users/approve`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(
				errorBody.error?.message ?? "Failed to bulk approve users",
			);
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
	nextCursor: string | null;
}

export interface AuditStats {
	totalActionsToday: number;
	uniqueUsersActive: number;
	accountChanges: number;
	failedLogins: number;
}

export const getAuditLogsFn = createServerFn({ method: "GET" })
	.inputValidator(auditLogsParamsSchema)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const query = new URLSearchParams();
		query.append("limit", "50");
		if (data.cursor) query.append("cursor", data.cursor);
		if (data.search) query.append("search", data.search);

		const response = await fetch(`${API_BASE}/audit-logs?${query.toString()}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch audit logs");
		}

		return (await response.json()) as AuditLogListResponse;
	});

export const getAuditStatsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/audit-logs/stats`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(
				errorBody.error?.message ?? "Failed to fetch audit stats",
			);
		}

		return (await response.json()) as AuditStats;
	},
);

export function auditLogsQueryOptions(params: {
	cursor?: string;
	search?: string;
}) {
	return queryOptions({
		queryKey: ["admin", "audit-logs", params],
		queryFn: () => getAuditLogsFn({ data: params }),
		staleTime: 1000 * 30, // 30 seconds
	});
}

export function auditStatsQueryOptions() {
	return queryOptions({
		queryKey: ["admin", "audit-stats"],
		queryFn: () => getAuditStatsFn(),
		staleTime: 1000 * 60, // 1 minute
	});
}
