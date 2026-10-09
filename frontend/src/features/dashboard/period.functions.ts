import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	dashboardYearSchema,
	type PeriodMetadata,
	periodMetadataSchema,
} from "@/lib/dashboard-year";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

const itemSchema = z.object({
	proposalId: z.uuid(),
	projectId: z.uuid().nullable(),
	title: z.string(),
	status: z.string(),
	targetStartDate: z.string().nullable(),
	targetEndDate: z.string().nullable(),
	createdAt: z.string(),
	isLeader: z.boolean(),
});
const facultyResponseSchema = periodMetadataSchema.extend({
	metrics: z.object({
		totalSubmissions: z.number(),
		ongoingProjects: z.number(),
		proposals: z.number(),
	}),
	items: z.array(itemSchema),
	total: z.number(),
});
export type DashboardItem = z.infer<typeof itemSchema>;
export type FacultyDashboardResponse = z.infer<typeof facultyResponseSchema>;
export type { PeriodMetadata };

const paginationSchema = z.object({
	page: z.number().int().min(1),
	limit: z.number().int().min(1).max(100),
});

export const getFacultyDashboardFn = createServerFn({ method: "GET" })
	.validator(paginationSchema.extend({ year: dashboardYearSchema }))
	.handler(async ({ data }) => {
		await authorizeSessionUser("Faculty");
		const token = await getValidAccessToken();
		const params = new URLSearchParams({
			year: String(data.year),
			page: String(data.page),
			limit: String(data.limit),
		});
		const response = await fetch(`${API_BASE}/dashboard/faculty?${params}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(response, "Unable to load your dashboard"),
			);
		return facultyResponseSchema.parse(await response.json());
	});

export function facultyDashboardQueryOptions(
	year: number,
	page = 1,
	limit = 10,
) {
	return queryOptions({
		queryKey: ["faculty", "dashboard", { year, page, limit }],
		queryFn: () => getFacultyDashboardFn({ data: { year, page, limit } }),
		staleTime: 60_000,
	});
}
