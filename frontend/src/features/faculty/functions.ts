import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "@/lib/session.server";
import type {
	FacultyContributorAvatar,
	FacultyInvolvement,
} from "@/types/user";

const STALE_TIME = 1000 * 60 * 5;

const directoryParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
});

const getFacultyDirectoryFn = createServerFn({ method: "GET" })
	.validator(directoryParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const query = new URLSearchParams({
			page: String(data.page),
			limit: String(data.limit),
		});
		if (data.search) query.append("search", data.search);
		if (data.college) query.append("college", data.college);
		if (data.status) query.append("status", data.status);
		const response = await fetch(`${API_BASE}/director/faculty?${query}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch faculty directory"),
			);
		}
		return (await response.json()) as {
			items: FacultyInvolvement[];
			total: number;
			metrics: {
				totalActiveExtension: number;
				averageProjectsPerFaculty: number;
				mostActiveCollege: {
					name: string;
					contributors: number;
					contributorAvatars: FacultyContributorAvatar[];
				};
			};
		};
	});

export function facultyDirectoryQueryOptions(
	params: z.infer<typeof directoryParamsSchema>,
) {
	return queryOptions({
		queryKey: ["dashboard", "faculty", params],
		queryFn: () => getFacultyDirectoryFn({ data: params }),
		staleTime: STALE_TIME,
		placeholderData: keepPreviousData,
	});
}

export type { FacultyInvolvement } from "@/types/user";

const FACULTY_QUERY_STALE_TIME_MS = 1000 * 60 * 5;
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

const facultyProposalsParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: proposalStatusFilterSchema.optional(),
});

const facultyProjectsParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: z.string().optional(),
});

export interface FacultyProposalItem {
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
	createdAt: string;
	updatedAt: string;
	targetStartDate?: string | null;
	targetEndDate?: string | null;
	leaderFirstName?: string | null;
	leaderLastName?: string | null;
	leaderAcademicRank?: string | null;
	isMember?: boolean;
}

export interface FacultyProposalListResponse {
	items: FacultyProposalItem[];
	total: number;
}

export interface FacultyProjectItem {
	projectId: string;
	proposalId: string;
	moaId: string | null;
	title?: string;
	extensionCategory?: string;
	targetStartDate?: string | null;
	targetEndDate?: string | null;
	actualEndDate?: string | null;
	projectStatus: string;
	createdAt: string;
	updatedAt: string;
	leaderFirstName?: string | null;
	leaderLastName?: string | null;
	leaderAcademicRank?: string | null;
	isMember?: boolean;
}

export interface FacultyProjectListResponse {
	items: FacultyProjectItem[];
	total: number;
}

const getFacultyProposalsFn = createServerFn({ method: "GET" })
	.validator(facultyProposalsParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
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
				"Failed to fetch faculty proposals",
			);
			throw new Error(message);
		}

		return (await response.json()) as FacultyProposalListResponse;
	});

const getFacultyProjectsFn = createServerFn({ method: "GET" })
	.validator(facultyProjectsParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const accessToken = await getValidAccessToken();

		const url = new URL(`${API_BASE}/projects`);
		url.searchParams.set("page", data.page.toString());
		url.searchParams.set("limit", data.limit.toString());

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch faculty projects",
			);
			throw new Error(message);
		}

		return (await response.json()) as FacultyProjectListResponse;
	});

export function facultyProposalsQueryOptions(params?: {
	page?: number;
	limit?: number;
	search?: string;
	status?: ProposalStatusFilter;
}) {
	const data = {
		page: params?.page ?? 1,
		limit: params?.limit ?? 100,
		search: params?.search,
		status: params?.status,
	};
	return queryOptions({
		queryKey: ["faculty", "proposals", data],
		queryFn: () => getFacultyProposalsFn({ data }),
		staleTime: FACULTY_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function facultyProjectsQueryOptions(params?: {
	page?: number;
	limit?: number;
}) {
	const data = {
		page: params?.page ?? 1,
		limit: params?.limit ?? 100,
	};
	return queryOptions({
		queryKey: ["faculty", "projects", data],
		queryFn: () => getFacultyProjectsFn({ data }),
		staleTime: FACULTY_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}
