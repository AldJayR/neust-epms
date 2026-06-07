import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ApiErrorResponse } from "./auth";
import { useAppSession } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const DIRECTOR_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

// ── Schemas ───────────────────────────────────────────────

const projectHubParamsSchema = z.object({
	cursor: z.string().optional(),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
});

const moaRepositoryParamsSchema = z.object({
	cursor: z.string().optional(),
	search: z.string().optional(),
	status: z.string().optional(),
});

const facultyDirectoryParamsSchema = z.object({
	cursor: z.string().optional(),
	search: z.string().optional(),
	college: z.string().optional(),
});

// ── Interfaces ────────────────────────────────────────────

export interface DirectorDashboardMetric {
	totalProjects: number;
	ongoingProjects: number;
	underEvaluation: number;
	completed: number;
}

export interface DirectorChartPoint {
	label: string;
	value: number;
}

export interface DirectorActivity {
	title: string;
	description: string;
	time: string;
}

export interface DirectorMoa {
	name: string;
	dueText: string;
}

export interface DirectorDashboardResponse {
	metrics: DirectorDashboardMetric;
	chartData: DirectorChartPoint[];
	recentActivities: DirectorActivity[];
	expiringMoas: DirectorMoa[];
}

export interface HubProject {
	id: string;
	title: string;
	leaderName: string;
	leaderRank: string | null;
	college: string | null;
	dateSubmitted: string;
	status: string;
	type: "Proposal" | "Project";
}

export interface ProjectHubResponse {
	items: HubProject[];
	total: number;
	nextCursor: string | null;
}

export interface ProjectHubParams {
	cursor?: string;
	search?: string;
	college?: string;
	status?: string;
}

export interface MoaItem {
	id: string;
	partnerOrganization: string;
	dateSigned: string;
	daysToExpiry: number | string;
	status: "Valid" | "Renewal Needed" | "Expired" | "Terminated";
}

export interface MoaRepositoryResponse {
	items: MoaItem[];
	total: number;
	nextCursor: string | null;
	metrics: {
		totalMoas: number;
		expiringWithin90Days: number;
		activePartnerships: number;
	};
}

export interface MoaRepositoryParams {
	cursor?: string;
	search?: string;
	status?: string;
}

export interface FacultyInvolvement {
	userId: string;
	firstName: string;
	lastName: string;
	academicRank: string | null;
	college: string | null;
	leadProjects: number;
	collaboratorProjects: number;
	totalInvolvement: number;
}

export interface FacultyDirectoryResponse {
	items: FacultyInvolvement[];
	total: number;
	nextCursor: string | null;
	metrics: {
		totalActiveExtension: number;
		averageProjectsPerFaculty: number;
		mostActiveCollege: {
			name: string;
			contributors: number;
		};
	};
}

export interface FacultyDirectoryParams {
	cursor?: string;
	search?: string;
	college?: string;
}

export interface ProjectMember {
	userId: string;
	name: string;
	role: string;
	avatarUrl?: string;
}

export interface ProjectHistoryItem {
	id: string;
	version: string;
	status: string;
	actorName: string;
	date: string;
	comment?: string;
}

export interface ProjectAttachment {
	id: string;
	name: string;
	type: string;
	url: string;
	version: string;
}

export interface ProjectDetailsResponse {
	id: string;
	title: string;
	status: string;
	version: string;
	metadata: {
		leader: {
			name: string;
			avatarUrl?: string;
		};
		department: string;
		duration: string;
		moaLinked: string;
		budget: {
			total: number;
			neust: number;
			partner: number;
		};
	};
	members: ProjectMember[];
	history: ProjectHistoryItem[];
	attachments: ProjectAttachment[];
}

export interface ReportItem {
	reportId: string;
	projectId: string;
	project: string;
	leader: string;
	department: string | null;
	reportType: string;
	submitted: string;
	storagePath: string | null;
	remarks: string | null;
	archivedAt: string | null;
}

export interface ReportsResponse {
	items: ReportItem[];
	total: number;
	nextCursor: string | null;
}

// ── Server Functions ──────────────────────────────────────

export const getDirectorDashboardFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/director/dashboard`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch director dashboard");
		}

		return (await response.json()) as DirectorDashboardResponse;
	},
);

export const getProjectHubFn = createServerFn({ method: "GET" })
	.inputValidator(projectHubParamsSchema)
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
		if (data.college) query.append("college", data.college);
		if (data.status) query.append("status", data.status);

		const response = await fetch(`${API_BASE}/director/hub/projects?${query.toString()}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch project hub");
		}

		return (await response.json()) as ProjectHubResponse;
	});

export const getMoaRepositoryFn = createServerFn({ method: "GET" })
	.inputValidator(moaRepositoryParamsSchema)
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
		if (data.status) query.append("status", data.status);

		const response = await fetch(`${API_BASE}/director/moas?${query.toString()}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch MOA repository");
		}

		return (await response.json()) as MoaRepositoryResponse;
	});

export const getFacultyDirectoryFn = createServerFn({ method: "GET" })
	.inputValidator(facultyDirectoryParamsSchema)
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
		if (data.college) query.append("college", data.college);

		const response = await fetch(`${API_BASE}/director/faculty?${query.toString()}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch faculty directory");
		}

		return (await response.json()) as FacultyDirectoryResponse;
	});

export const getProjectDetailsFn = createServerFn({ method: "GET" })
	.inputValidator(z.string())
	.handler(async ({ data: proposalId }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/director/projects/${proposalId}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch project details");
		}

		return (await response.json()) as ProjectDetailsResponse;
	});

export const reviewProposalFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			proposalId: z.string(),
			decision: z.enum(["Endorsed", "Approved", "Returned", "Rejected"]),
			comments: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(
			`${API_BASE}/proposals/${data.proposalId}/review`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					decision: data.decision,
					comments: data.comments,
				}),
			},
		);

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to submit review");
		}

		return (await response.json()) as { message: string };
	});

export const getReportStatsFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const response = await fetch(`${API_BASE}/reports?limit=100`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			const errorBody = (await response.json()) as ApiErrorResponse;
			throw new Error(errorBody.error?.message ?? "Failed to fetch reports");
		}

		return (await response.json()) as ReportsResponse;
	},
);

// ── Query Options ─────────────────────────────────────────

export function directorDashboardQueryOptions() {
	return queryOptions({
		queryKey: ["director", "dashboard"],
		queryFn: () => getDirectorDashboardFn(),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function projectHubQueryOptions(params: ProjectHubParams) {
	return queryOptions({
		queryKey: ["director", "hub", "projects", params],
		queryFn: () => getProjectHubFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function moaRepositoryQueryOptions(params: MoaRepositoryParams) {
	return queryOptions({
		queryKey: ["director", "moas", params],
		queryFn: () => getMoaRepositoryFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function facultyDirectoryQueryOptions(params: FacultyDirectoryParams) {
	return queryOptions({
		queryKey: ["director", "faculty", params],
		queryFn: () => getFacultyDirectoryFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function projectDetailsQueryOptions(proposalId: string) {
	return queryOptions({
		queryKey: ["director", "proposals", proposalId],
		queryFn: () => getProjectDetailsFn({ data: proposalId }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function reportsQueryOptions() {
	return queryOptions({
		queryKey: ["director", "reports"],
		queryFn: () => getReportStatsFn(),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}
