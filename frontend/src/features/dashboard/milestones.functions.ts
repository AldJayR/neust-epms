import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import type { DirectorMilestonesResponse } from "@/types/dashboard";

const getDirectorMilestonesFn = createServerFn({ method: "GET" })
	.validator(
		z.object({
			page: z.number().int().min(1).max(100000),
			limit: z.number().int().min(1).max(50),
		}),
	)
	.handler(async ({ data }) => {
		await authorizeSessionUser("Director");
		const token = await getValidAccessToken();
		const query = new URLSearchParams({
			page: String(data.page),
			limit: String(data.limit),
		});
		const response = await fetch(`${API_BASE}/director/milestones?${query}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok)
			throw new Error(
				await getErrorMessage(
					response,
					"Unable to load recent project updates",
				),
			);
		return (await response.json()) as DirectorMilestonesResponse;
	});

export function directorMilestonesQueryOptions(page = 1, limit = 5) {
	return queryOptions({
		queryKey: ["dashboard", "milestones", { page, limit }],
		queryFn: () => getDirectorMilestonesFn({ data: { page, limit } }),
		staleTime: 60_000,
	});
}
