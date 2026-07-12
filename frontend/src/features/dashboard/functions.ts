import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "@/lib/session.server";
import type { DirectorDashboardResponse } from "@/types/dashboard";

const STALE_TIME = 1000 * 60 * 5;

const getDirectorDashboardFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser("Director", "RET Chair");
		const token = await getValidAccessToken();
		const response = await fetch(`${API_BASE}/director/dashboard`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw new Error(
				await getErrorMessage(response, "Failed to fetch director dashboard"),
			);
		}
		return (await response.json()) as DirectorDashboardResponse;
	});

export function directorDashboardQueryOptions() {
	return queryOptions({
		queryKey: ["dashboard", "stats"],
		queryFn: () => getDirectorDashboardFn(),
		staleTime: STALE_TIME,
	});
}
