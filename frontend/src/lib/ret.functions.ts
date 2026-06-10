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
		// Note: Backend might need to support status filter in /proposals if we want it

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
