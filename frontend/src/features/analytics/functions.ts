import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import {
	type AnalyticsFilters,
	type AnalyticsView,
	analyticsResponseSchema,
	analyticsSearchSchema,
	analyticsViews,
} from "./schema";

const requestSchema = z.object({
	view: z.enum(analyticsViews),
	filters: analyticsSearchSchema,
});
async function fetchAnalytics(
	view: AnalyticsView,
	filters: AnalyticsFilters,
	exporting: boolean,
) {
	await authorizeSessionUser("Director", "RET Chair", "Faculty");
	const token = await getValidAccessToken();
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters))
		if (value !== undefined) params.set(key, String(value));
	const response = await fetch(
		`${API_BASE}/analytics/${view}${exporting ? "/export" : ""}?${params}`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!response.ok)
		throw new Error(
			await getErrorMessage(response, "Could not load extension analytics"),
		);
	return response;
}
export const getAnalyticsFn = createServerFn({ method: "GET" })
	.validator(requestSchema)
	.handler(async ({ data }) => {
		const response = await fetchAnalytics(data.view, data.filters, false);
		return analyticsResponseSchema.parse(await response.json());
	});
export const exportAnalyticsFn = createServerFn({ method: "GET" })
	.validator(requestSchema)
	.handler(async ({ data }) =>
		(await fetchAnalytics(data.view, data.filters, true)).text(),
	);
export function analyticsQueryOptions(
	view: AnalyticsView,
	filters: AnalyticsFilters,
) {
	return queryOptions({
		queryKey: ["analytics", view, filters],
		queryFn: () => getAnalyticsFn({ data: { view, filters } }),
		staleTime: 60_000,
	});
}
