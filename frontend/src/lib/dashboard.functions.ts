import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "./auth.functions";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

export const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const DIRECTOR_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

// ── Schemas ───────────────────────────────────────────────

const projectHubParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
	myProjectsOnly: z.string().optional(),
});

const moaRepositoryParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	status: z.string().optional(),
});

const facultyDirectoryParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
});

// ── Interfaces ────────────────────────────────────────────

export interface DirectorDashboardMetric {
	totalProjects: number;
	ongoingProjects: number;
	underEvaluation: number;
	completed: number;
	overdueProjects?: number;
	pendingClosureProjects?: number;
}

export interface DirectorChartPoint {
	label: string;
	department: string;
	departmentCode: string;
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
	lastReportDate?: string | null;
	status: string;
	type: "Proposal" | "Project";
}

export interface ProjectHubResponse {
	items: HubProject[];
	total: number;
}

export interface ProjectHubParams {
	page: number;
	limit: number;
	search?: string;
	college?: string;
	status?: string;
	myProjectsOnly?: string;
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
	metrics: {
		totalMoas: number;
		expiringWithin90Days: number;
		activePartnerships: number;
	};
}

export interface MoaRepositoryParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
}

export interface FacultyInvolvement {
	userId: string;
	firstName: string;
	lastName: string;
	academicRank: string | null;
	college: string | null;
	departmentCode: string | null;
	campusName: string | null;
	isMainCampus: boolean | null;
	isActive: boolean;
	leadProjects: number;
	collaboratorProjects: number;
	totalInvolvement: number;
}

export interface FacultyDirectoryResponse {
	items: FacultyInvolvement[];
	total: number;
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
	page: number;
	limit: number;
	search?: string;
	college?: string;
	status?: string;
}

export interface ProjectMemberSpecialOrder {
	specialOrderId: string;
	soNumber: string;
	storagePath: string | null;
	dateIssued: string | null;
	status: string;
}

export interface ProjectMember {
	memberId: string;
	userId: string;
	name: string;
	role: string;
	avatarUrl?: string;
	specialOrder?: ProjectMemberSpecialOrder | null;
}

export interface ProjectHistoryItem {
	id: string;
	type: "document" | "review" | "edit";
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
	bypassedRetChair: boolean;
	metadata: {
		leader: {
			name: string;
			avatarUrl?: string;
		};
		departmentCode: string;
		department: string;
		duration: string;
		moaLinked: string;
		sdgs?: string;
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
}

export interface ReportStatsResponse {
	total: number;
	progress: number;
	terminal: number;
}

// ── Server Functions ──────────────────────────────────────

const getDirectorDashboardFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/director/dashboard`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch director dashboard",
			);
			throw new Error(message);
		}

		return (await response.json()) as DirectorDashboardResponse;
	});

const getProjectHubFn = createServerFn({ method: "GET" })
	.validator(projectHubParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const query = new URLSearchParams({
			page: data.page.toString(),
			limit: data.limit.toString(),
		});

		if (data.search) query.append("search", data.search);
		if (data.college) query.append("college", data.college);
		if (data.status) query.append("status", data.status);
		if (data.myProjectsOnly)
			query.append("myProjectsOnly", data.myProjectsOnly);

		const response = await fetch(
			`${API_BASE}/director/hub/projects?${query.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch project hub",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProjectHubResponse;
	});

const getMoaRepositoryFn = createServerFn({ method: "GET" })
	.validator(moaRepositoryParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const query = new URLSearchParams({
			page: data.page.toString(),
			limit: data.limit.toString(),
		});

		if (data.search) query.append("search", data.search);
		if (data.status) query.append("status", data.status);

		const response = await fetch(
			`${API_BASE}/director/moas?${query.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch MOA repository",
			);
			throw new Error(message);
		}

		return (await response.json()) as MoaRepositoryResponse;
	});

const getFacultyDirectoryFn = createServerFn({ method: "GET" })
	.validator(facultyDirectoryParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const query = new URLSearchParams({
			page: data.page.toString(),
			limit: data.limit.toString(),
		});

		if (data.search) query.append("search", data.search);
		if (data.college) query.append("college", data.college);
		if (data.status) query.append("status", data.status);

		const response = await fetch(
			`${API_BASE}/director/faculty?${query.toString()}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch faculty directory",
			);
			throw new Error(message);
		}

		return (await response.json()) as FacultyDirectoryResponse;
	});

const getProjectDetailsFn = createServerFn({ method: "GET" })
	.validator(z.string())
	.handler(async ({ data: proposalId }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/projects/${proposalId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch project details",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProjectDetailsResponse;
	});

export const reviewProposalFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			proposalId: z.uuid(),
			decision: z.enum(["Endorsed", "Approved", "Returned", "Rejected"]),
			comments: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/proposals/${data.proposalId}/review`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					decision: data.decision,
					comments: data.comments,
				}),
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to submit review",
			);
			throw new Error(message);
		}

		return (await response.json()) as { message: string };
	});

const reportsListParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
});

const getReportsListFn = createServerFn({ method: "GET" })
	.validator(reportsListParamsSchema)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();

		const searchParams = new URLSearchParams({
			page: String(data.page),
			limit: String(data.limit),
		});
		if (data.search) searchParams.set("search", data.search);

		const response = await fetch(
			`${API_BASE}/reports?${searchParams.toString()}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		);
		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch reports",
			);
			throw new Error(message);
		}
		return (await response.json()) as ReportsResponse;
	});

const getReportStatsFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/reports/stats`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch report stats",
			);
			throw new Error(message);
		}

		return (await response.json()) as ReportStatsResponse;
	});

export const getSpecialOrderSignedUrlFn = createServerFn({ method: "GET" })
	.validator(z.string())
	.handler(async ({ data: specialOrderId }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/special-orders/${specialOrderId}/url`,
			{
				headers: { Authorization: `Bearer ${token}` },
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to get signed URL",
			);
			throw new Error(message);
		}

		return (await response.json()) as { url: string };
	});

export const getAccessTokenForUploadFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Director", "RET Chair");
		return getValidAccessToken();
	});

// ── Query Options ─────────────────────────────────────────

export function directorDashboardQueryOptions() {
	return queryOptions({
		queryKey: ["dashboard", "stats"],
		queryFn: () => getDirectorDashboardFn(),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function projectHubQueryOptions(params: ProjectHubParams) {
	return queryOptions({
		queryKey: ["dashboard", "hub", "projects", params],
		queryFn: () => getProjectHubFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function moaRepositoryQueryOptions(params: MoaRepositoryParams) {
	return queryOptions({
		queryKey: ["dashboard", "moas", params],
		queryFn: () => getMoaRepositoryFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function facultyDirectoryQueryOptions(params: FacultyDirectoryParams) {
	return queryOptions({
		queryKey: ["dashboard", "faculty", params],
		queryFn: () => getFacultyDirectoryFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export function projectDetailsQueryOptions(proposalId: string) {
	return queryOptions({
		queryKey: ["dashboard", "proposals", proposalId],
		queryFn: () => getProjectDetailsFn({ data: proposalId }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function reportsQueryOptions() {
	return queryOptions({
		queryKey: ["dashboard", "reports", "stats"],
		queryFn: () => getReportStatsFn(),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
	});
}

export function reportsListQueryOptions(params: {
	page: number;
	limit: number;
	search?: string;
}) {
	return queryOptions({
		queryKey: ["dashboard", "reports", "list", params],
		queryFn: () => getReportsListFn({ data: params }),
		staleTime: DIRECTOR_QUERY_STALE_TIME_MS,
		placeholderData: keepPreviousData,
	});
}

export const emailReportFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			search: z.string().optional(),
			college: z.string().optional(),
			status: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { authorizeSessionUser, getValidAccessToken } = await import(
			"./session.server"
		);
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/director/email-report`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to send email report",
			);
			throw new Error(message);
		}

		return (await response.json()) as { success: boolean; message: string };
	});

export const submitReportFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			projectId: z.string().uuid(),
			reportType: z.enum(["Progress", "Final Accomplishment", "Terminal"]),
			remarks: z.string().optional(),
			periodStart: z.string().optional(),
			periodEnd: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { authorizeSessionUser, getValidAccessToken } = await import(
			"./session.server"
		);
		await authorizeSessionUser("Faculty", "RET Chair", "Director");
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/reports`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to submit report",
			);
			throw new Error(message);
		}

		return (await response.json()) as ReportItem;
	});

// ── Transition Project Status ──
export const transitionProjectFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			projectId: z.uuid(),
			status: z.enum(["Ongoing"]),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/projects/${data.projectId}/transition`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ status: data.status }),
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to activate project",
			);
			throw new Error(message);
		}

		return (await response.json()) as { message: string };
	});
