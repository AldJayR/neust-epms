import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "@/lib/session.server";
import type { DerivedStateResponse } from "@/types/derived-state";

const getProjectDerivedStateFn = createServerFn({ method: "GET" })
	.validator(z.string().uuid())
	.handler(async ({ data: projectId }) => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/projects/${projectId}/derived-state`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch project derived state",
			);
			throw new Error(message);
		}

		return (await response.json()) as DerivedStateResponse;
	});

export function projectDerivedStateQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["project-derived-state", projectId],
		queryFn: () => getProjectDerivedStateFn({ data: projectId }),
		staleTime: 30_000,
	});
}

export type { DerivedStateResponse } from "@/types/derived-state";
