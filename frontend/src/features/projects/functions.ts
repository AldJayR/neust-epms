import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "@/lib/session.server";
import type {
	ProjectDetailsResponse,
	ProjectHubParams,
	ProjectHubResponse,
} from "@/types/project";

const STALE_TIME = 1000 * 60 * 5;

const projectHubParamsSchema = z.object({
	page: z.number(),
	limit: z.number(),
	search: z.string().optional(),
	college: z.string().optional(),
	status: z.string().optional(),
	myProjectsOnly: z.string().optional(),
});

const getProjectHubFn = createServerFn({ method: "GET" })
	.validator(projectHubParamsSchema)
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
		if (data.myProjectsOnly)
			query.append("myProjectsOnly", data.myProjectsOnly);
		const response = await fetch(
			`${API_BASE}/director/hub/projects?${query}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		);
		if (!response.ok) {
			throw new Error(await getErrorMessage(response, "Failed to fetch project hub"));
		}
		return (await response.json()) as ProjectHubResponse;
	});

export function projectHubQueryOptions(params: ProjectHubParams) {
	return queryOptions({
		queryKey: ["dashboard", "hub", "projects", params],
		queryFn: () => getProjectHubFn({ data: params }),
		staleTime: STALE_TIME,
		placeholderData: keepPreviousData,
	});
}

export const transitionProjectFn = createServerFn({ method: "POST" })
	.validator(z.object({ projectId: z.uuid(), status: z.enum(["Ongoing"]) }))
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
			throw new Error(await getErrorMessage(response, "Failed to activate project"));
		}
		return (await response.json()) as { message: string };
	});

export const closeProjectFn = createServerFn({ method: "POST" })
	.validator(z.object({ projectId: z.string().uuid() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/projects/${data.projectId}/close`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(await getErrorMessage(response, "Failed to close project"));
		}
		return (await response.json()) as { message: string };
	});

export const activateProjectFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			projectId: z.uuid(),
			moaId: z.uuid(),
			reportingFrequency: z.enum([
				"Monthly",
				"Quarterly",
				"Semestral",
				"Custom",
			]),
			dueDates: z.array(
				z.object({ reportType: z.string(), dueDate: z.string() }),
			),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/projects/${data.projectId}/activate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				moaId: data.moaId,
				reportingFrequency: data.reportingFrequency,
				dueDates: data.dueDates,
			}),
		});
		if (!response.ok) {
			throw new Error(await getErrorMessage(response, "Failed to activate project"));
		}
		return (await response.json()) as { message: string };
	});

const getProjectDetailsFn = createServerFn({ method: "GET" })
	.validator(z.string())
	.handler(async ({ data: projectId }) => {
		await authorizeSessionUser("Director", "RET Chair", "Faculty");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/projects/${projectId}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch project details"),
			);
		}
		return (await response.json()) as ProjectDetailsResponse;
	});

export function projectDetailsQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["dashboard", "proposals", projectId],
		queryFn: () => getProjectDetailsFn({ data: projectId }),
		staleTime: STALE_TIME,
	});
}

export type {
	HubProject,
	ProjectDetailsResponse,
	ProjectHistoryItem,
	ProjectMember,
	ProjectHubParams,
	ProjectHubResponse,
} from "@/types/project";
