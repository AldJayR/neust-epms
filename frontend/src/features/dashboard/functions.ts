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
import type { DirectorDashboardResponse } from "@/types/dashboard";

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
