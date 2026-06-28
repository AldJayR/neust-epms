import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "./auth.functions";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const FACULTY_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

// ── Schemas ───────────────────────────────────────────────

const facultyProposalsParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: z.string().optional(),
});

const facultyProjectsParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: z.string().optional(),
});

// ── Interfaces ────────────────────────────────────────────

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

// ── Server Functions ──────────────────────────────────────

const getFacultyProposalsFn = createServerFn({ method: "GET" })
	.validator(facultyProposalsParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director", "Super Admin");
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
			const message = await getErrorMessage(response, "Failed to fetch faculty proposals");
			throw new Error(message);
		}

		return (await response.json()) as FacultyProposalListResponse;
	});

const getFacultyProjectsFn = createServerFn({ method: "GET" })
	.validator(facultyProjectsParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty", "RET Chair", "Director", "Super Admin");
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
			const message = await getErrorMessage(response, "Failed to fetch faculty projects");
			throw new Error(message);
		}

		return (await response.json()) as FacultyProjectListResponse;
	});

// ── Query Options ─────────────────────────────────────────

export function facultyProposalsQueryOptions(params: {
	page: number;
	limit: number;
	search?: string;
	status?: string;
}) {
	return queryOptions({
		queryKey: ["faculty", "proposals", params],
		queryFn: () => getFacultyProposalsFn({ data: params }),
		staleTime: FACULTY_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function facultyProjectsQueryOptions(params: {
	page: number;
	limit: number;
}) {
	return queryOptions({
		queryKey: ["faculty", "projects", params],
		queryFn: () => getFacultyProjectsFn({ data: params }),
		staleTime: FACULTY_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}
