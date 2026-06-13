import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ApiErrorResponse } from "./auth";
import { useAppSession } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const RET_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

// ── Schemas ───────────────────────────────────────────────

const retDashboardParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: z.string().optional(),
});

// ── Interfaces ────────────────────────────────────────────

export interface RETDashboardStats {
	pendingReview: number;
	approvedProjects: number;
	deniedProjects: number;
}

export interface ProposalItem {
	proposalId: string;
	campusId: number;
	departmentId: number | null;
	title: string;
	bannerProgram: string;
	projectLocale: string;
	extensionCategory: string;
	budgetPartner: string | null;
	budgetNeust: string | null;
	status: string;
	bypassedRetChair: boolean;
	revisionNum: number;
	targetStartDate?: string | null;
	targetEndDate?: string | null;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	leaderFirstName?: string | null;
	leaderLastName?: string | null;
	leaderAcademicRank?: string | null;
}

export interface ProposalListResponse {
	items: ProposalItem[];
	total: number;
}

export interface RETDashboardParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
}

export interface CreateProposalInput {
	campusId: number;
	departmentId: number;
	title: string;
	bannerProgram: string;
	projectLocale: string;
	extensionCategory: string;
	budgetPartner?: number;
	budgetNeust?: number;
	targetStartDate?: string;
	targetEndDate?: string;
	departmentIds?: number[];
	sectorIds?: number[];
	sdgIds?: number[];
	members?: {
		userId: string;
		projectRole: string;
	}[];
}

export interface SDG {
	sdgId: number;
	sdgName: string;
}

export interface Sector {
	sectorId: number;
	sectorName: string;
}

export interface MetadataItem {
	id: number;
	name: string;
}

// ── Server Functions ──────────────────────────────────────

export const getRETDashboardStatsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/proposals/ret/dashboard-stats`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch RET stats");
		}

		return (await response.json()) as RETDashboardStats;
	},
);

export const getRETProposalsFn = createServerFn({ method: "GET" })
	.inputValidator(retDashboardParamsSchema)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const url = new URL(`${API_BASE}/proposals`);
		url.searchParams.set("page", data.page.toString());
		url.searchParams.set("limit", data.limit.toString());
		if (data.search) url.searchParams.set("search", data.search);

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch proposals");
		}

		return (await response.json()) as ProposalListResponse;
	});

export const createProposalFn = createServerFn({ method: "POST" })
	.inputValidator((data: CreateProposalInput) => data)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/proposals`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to create proposal");
		}

		return (await response.json()) as ProposalItem;
	});

export const uploadProposalDocumentFn = createServerFn({ method: "POST" })
	.inputValidator((data: FormData) => {
		const proposalId = data.get("proposalId");
		if (typeof proposalId !== "string" || !proposalId) {
			throw new Error("proposalId is required");
		}
		return data;
	})
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const proposalId = data.get("proposalId") as string;
		const file = data.get("file");

		if (!(file instanceof File)) {
			throw new Error("A PDF file is required");
		}

		const response = await fetch(
			`${API_BASE}/proposals/${proposalId}/documents/upload`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
				body: data,
			},
		);

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to upload document");
		}

		return (await response.json()) as {
			documentId: string;
			storagePath: string;
			versionNum: number;
		};
	});

export const getSDGsFn = createServerFn({ method: "GET" }).handler(async () => {
	const session = await useAppSession();
	const { accessToken } = session.data;
	if (!accessToken) throw new Error("Unauthorized");

	const response = await fetch(`${API_BASE}/proposals/metadata/sdgs`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new Error("Failed to fetch SDGs");
	return (await response.json()) as SDG[];
});

export const getSectorsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;
		if (!accessToken) throw new Error("Unauthorized");

		const response = await fetch(`${API_BASE}/proposals/metadata/sectors`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (!response.ok) throw new Error("Failed to fetch sectors");
		return (await response.json()) as Sector[];
	},
);

export const getDepartmentsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const response = await fetch(`${API_BASE}/auth/departments`);
		if (!response.ok) throw new Error("Failed to fetch departments");
		return (await response.json()) as MetadataItem[];
	},
);

export const getCampusesFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const response = await fetch(`${API_BASE}/auth/campuses`);
		if (!response.ok) throw new Error("Failed to fetch campuses");
		return (await response.json()) as MetadataItem[];
	},
);

// ── Query Options ─────────────────────────────────────────

export function retDashboardStatsQueryOptions() {
	return queryOptions({
		queryKey: ["ret", "dashboard", "stats"],
		queryFn: () => getRETDashboardStatsFn(),
		staleTime: RET_QUERY_STALE_TIME_MS,
	});
}

export function retProposalsQueryOptions(params: RETDashboardParams) {
	return queryOptions({
		queryKey: ["ret", "dashboard", "proposals", params],
		queryFn: () => getRETProposalsFn({ data: params }),
		staleTime: RET_QUERY_STALE_TIME_MS,
	});
}

export function sdgsQueryOptions() {
	return queryOptions({
		queryKey: ["metadata", "sdgs"],
		queryFn: () => getSDGsFn(),
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}

export function sectorsQueryOptions() {
	return queryOptions({
		queryKey: ["metadata", "sectors"],
		queryFn: () => getSectorsFn(),
		staleTime: 1000 * 60 * 60,
	});
}

export function departmentsQueryOptions() {
	return queryOptions({
		queryKey: ["metadata", "departments"],
		queryFn: () => getDepartmentsFn(),
		staleTime: 1000 * 60 * 60,
	});
}

export function campusesQueryOptions() {
	return queryOptions({
		queryKey: ["metadata", "campuses"],
		queryFn: () => getCampusesFn(),
		staleTime: 1000 * 60 * 60,
	});
}
