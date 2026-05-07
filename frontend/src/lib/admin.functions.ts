import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { useAppSession } from "./session.server";
import type { ApiErrorResponse } from "./auth";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const ADMIN_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

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
	.inputValidator(
		(d: { search?: string; page?: number; pageSize?: number; isActive?: string }) => d,
	)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const query = new URLSearchParams();
		if (data.search) query.append("search", data.search);
		if (data.isActive) query.append("isActive", data.isActive);
		if (data.page) query.append("page", data.page.toString());
		if (data.pageSize) query.append("pageSize", data.pageSize.toString());

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

interface BulkUpdateStatusInput {
	userIds: string[];
	isActive: boolean;
}

export const bulkUpdateUserStatusFn = createServerFn({ method: "POST" })
	.inputValidator((d: BulkUpdateStatusInput) => d)
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

interface BulkApproveInput {
	users: {
		userId: string;
		roleName: string;
	}[];
}

export const bulkApproveUsersFn = createServerFn({ method: "POST" })
	.inputValidator((d: BulkApproveInput) => d)
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
