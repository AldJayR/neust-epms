import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";
import type { ProposalFull, ProposalItem } from "@/types/proposal";

const RET_QUERY_STALE_TIME_MS = 1000 * 60 * 5;
const proposalStatusFilterSchema = z.enum([
	"all",
	"Draft",
	"Pending Review",
	"Endorsed",
	"Approved",
	"Returned",
	"Rejected",
]);
export type ProposalStatusFilter = z.infer<typeof proposalStatusFilterSchema>;

// ── Schemas ───────────────────────────────────────────────

const retDashboardParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: proposalStatusFilterSchema.optional(),
});

const createProposalSchema = z.object({
	campusId: z.number(),
	departmentId: z.number(),
	title: z.string().min(1),
	bannerProgram: z.string().min(1),
	projectLocale: z.string().min(1),
	extensionCategory: z.string().min(1),
	budgetPartner: z.number().optional(),
	budgetNeust: z.number().optional(),
	targetStartDate: z.string().optional(),
	targetEndDate: z.string().optional(),
	departmentIds: z.array(z.number()).optional(),
	sectorIds: z.array(z.number()).optional(),
	sectorNames: z.array(z.string()).optional(),
	sdgIds: z.array(z.number()).optional(),
	members: z
		.array(
			z.object({
				userId: z.uuid(),
				projectRole: z.string().min(1),
			}),
		)
		.optional(),
});

// ── Interfaces ────────────────────────────────────────────

export interface RETDashboardStats {
	pendingReview: number;
	approvedProjects: number;
	deniedProjects: number;
}

export interface ProposalListResponse {
	items: ProposalItem[];
	total: number;
}

export interface RETDashboardParams {
	page: number;
	limit: number;
	search?: string;
	status?: ProposalStatusFilter;
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
	sectorNames?: string[];
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

// ── Server Functions ──────────────────────────────────────

const getRETDashboardStatsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		await authorizeSessionUser("RET Chair", "Director");
		const accessToken = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/proposals/ret/dashboard-stats`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch RET stats",
			);
			throw new Error(message);
		}

		return (await response.json()) as RETDashboardStats;
	},
);

const getRETProposalsFn = createServerFn({ method: "GET" })
	.validator(retDashboardParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair", "Director");
		const accessToken = await getValidAccessToken();

		const url = new URL(`${API_BASE}/proposals`);
		url.searchParams.set("page", data.page.toString());
		url.searchParams.set("limit", data.limit.toString());
		if (data.search) url.searchParams.set("search", data.search);
		if (data.status && data.status !== "all") {
			url.searchParams.set("status", data.status);
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch proposals",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProposalListResponse;
	});

export const createProposalFn = createServerFn({ method: "POST" })
	.validator(createProposalSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair", "Director", "Faculty");
		const accessToken = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/proposals`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to create proposal",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProposalItem;
	});

export const uploadProposalDocumentFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		const proposalId = data.get("proposalId");
		if (typeof proposalId !== "string" || !proposalId) {
			throw new Error("proposalId is required");
		}
		const file = data.get("file");
		if (!(file instanceof File)) {
			throw new Error("file is required and must be a File");
		}
		if (file.type !== "application/pdf") {
			throw new Error("Only PDF documents are allowed");
		}
		return data;
	})
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair", "Director", "Faculty");
		const accessToken = await getValidAccessToken();

		const proposalId = data.get("proposalId") as string;

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
			const message = await getErrorMessage(
				response,
				"Failed to upload document",
			);
			throw new Error(message);
		}

		return (await response.json()) as {
			documentId: string;
			storagePath: string;
			versionNum: number;
		};
	});

const getSDGsFn = createServerFn({ method: "GET" }).handler(async () => {
	const accessToken = await getValidAccessToken();

	const response = await fetch(`${API_BASE}/proposals/metadata/sdgs`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new Error("Failed to fetch SDGs");
	return (await response.json()) as SDG[];
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
		placeholderData: keepPreviousData,
	});
}

export function sdgsQueryOptions() {
	return queryOptions({
		queryKey: ["metadata", "sdgs"],
		queryFn: () => getSDGsFn(),
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}

// ── Edit Proposal Functions ─────────────────────────────

export const getProposalByIdFn = createServerFn({ method: "GET" })
	.validator(z.object({ proposalId: z.string() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair", "Director", "Faculty");
		const accessToken = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/proposals/${data.proposalId}`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch proposal",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProposalFull;
	});

const updateProposalSchema = z.object({
	proposalId: z.string(),
	title: z.string().min(1),
	bannerProgram: z.string().min(1),
	projectLocale: z.string().min(1),
	extensionCategory: z.string().min(1),
	budgetPartner: z.number().optional(),
	budgetNeust: z.number().optional(),
	sectorNames: z.array(z.string()).optional(),
});

export const submitProposalFn = createServerFn({ method: "POST" })
	.validator(z.object({ proposalId: z.string() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair", "Director", "Faculty");
		const accessToken = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/proposals/${data.proposalId}/submit`,
			{
				method: "POST",
				headers: { Authorization: `Bearer ${accessToken}` },
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to submit proposal",
			);
			throw new Error(message);
		}

		return (await response.json()) as { message: string };
	});

export const updateProposalFn = createServerFn({ method: "POST" })
	.validator(updateProposalSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("RET Chair", "Director", "Faculty");
		const accessToken = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/proposals/${data.proposalId}`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: data.title,
				bannerProgram: data.bannerProgram,
				projectLocale: data.projectLocale,
				extensionCategory: data.extensionCategory,
				budgetPartner: data.budgetPartner,
				budgetNeust: data.budgetNeust,
				sectorNames: data.sectorNames,
			}),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to update proposal",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProposalItem;
	});

export interface ProposalRequirements {
	documents: {
		type: string;
		label: string;
		required: boolean;
		description: string;
	}[];
	members: { required: boolean; description: string };
	sectors: { required: boolean; description: string };
	sdgs: { required: boolean; description: string };
	budget: { required: boolean; description: string };
	dates: { required: boolean; description: string };
}

export const getProposalRequirementsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const accessToken = await getValidAccessToken();
	const response = await fetch(`${API_BASE}/proposals/metadata/requirements`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) throw new Error("Failed to fetch proposal requirements");
	return (await response.json()) as ProposalRequirements;
});

export function proposalRequirementsQueryOptions() {
	return queryOptions({
		queryKey: ["metadata", "proposal-requirements"],
		queryFn: () => getProposalRequirementsFn(),
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}
