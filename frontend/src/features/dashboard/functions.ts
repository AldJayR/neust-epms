import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	dashboardYearSchema,
	periodMetadataSchema,
} from "@/lib/dashboard-year";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import type {
	DirectorDashboardResponse,
	DirectorOverviewFilters,
	DirectorOverviewResponse,
	DirectorWorkQueue,
	DirectorWorkQueueResponse,
} from "@/types/dashboard";

const STALE_TIME = 1000 * 60 * 5;

const getDirectorDashboardFn = createServerFn({ method: "GET" })
	.validator(z.object({ year: dashboardYearSchema.optional() }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const url = new URL(`${API_BASE}/director/dashboard`);
		if (data.year !== undefined)
			url.searchParams.set("year", String(data.year));
		const response = await fetch(url.toString(), {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch director dashboard"),
			);
		}
		const payload = await response.json();
		return {
			...payload,
			...periodMetadataSchema.parse(payload),
		} as DirectorDashboardResponse;
	});

export function directorDashboardQueryOptions(year?: number) {
	return queryOptions({
		queryKey: ["dashboard", "stats", { year }],
		queryFn: () => getDirectorDashboardFn({ data: { year } }),
		staleTime: STALE_TIME,
	});
}

const getDirectorOverviewFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			year: dashboardYearSchema,
			campusId: z.number().int().positive().optional(),
			departmentId: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();
		const query = new URLSearchParams({ year: String(data.year) });
		if (data.campusId !== undefined)
			query.set("campusId", String(data.campusId));
		if (data.departmentId !== undefined)
			query.set("departmentId", String(data.departmentId));
		const response = await fetch(`${API_BASE}/director/overview?${query}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(
					response,
					"Unable to load institutional overview",
				),
			);
		return (await response.json()) as DirectorOverviewResponse;
	});

export function directorOverviewQueryOptions(filters: DirectorOverviewFilters) {
	return queryOptions({
		queryKey: ["dashboard", "director-overview", filters],
		queryFn: () => getDirectorOverviewFn({ data: filters }),
		staleTime: STALE_TIME,
	});
}

const getDirectorWorkQueueFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			queue: z.enum([
				"review",
				"signing",
				"activation",
				"completion",
				"reports",
			]),
			page: z.number().int().min(1).max(100000),
			limit: z.number().int().min(1).max(50),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();
		const query = new URLSearchParams({
			queue: data.queue,
			page: String(data.page),
			limit: String(data.limit),
		});
		const response = await fetch(`${API_BASE}/director/work-queues?${query}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(response, "Unable to load current work"),
			);
		return (await response.json()) as DirectorWorkQueueResponse;
	});

export function directorWorkQueueQueryOptions(
	queue: DirectorWorkQueue,
	page = 1,
	limit = 5,
) {
	return queryOptions({
		queryKey: ["dashboard", "director-work", { queue, page, limit }],
		queryFn: () => getDirectorWorkQueueFn({ data: { queue, page, limit } }),
		staleTime: 60 * 1000,
	});
}
