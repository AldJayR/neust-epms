import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import type { ApiErrorResponse } from "./auth";
import { useAppSession } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3000/api/v1";
const DIRECTOR_QUERY_STALE_TIME_MS = 1000 * 60 * 5;

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
}

export interface ProjectHubParams {
	page: number;
	limit: number;
	search?: string;
	college?: string;
	status?: string;
}

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
	.validator((params: ProjectHubParams) => params)
	.handler(async ({ data }) => {
		const session = await useAppSession();
		const { accessToken } = session.data;

		if (!accessToken) {
			throw new Error("Unauthorized");
		}

		const query = new URLSearchParams({
			page: data.page.toString(),
			limit: data.limit.toString(),
		});

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
