import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { authorizeSessionUser, getValidAccessToken } from "@/lib/session.server";


export interface ReadinessPrerequisite {
	name: string;
	complete: boolean;
	owner: string;
	details: string;
}

export interface ProjectReadinessResponse {
	isReady: boolean;
	prerequisites: ReadinessPrerequisite[];
	blocker: string | null;
}

const getProjectReadinessFn = createServerFn({ method: "GET" })
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
			`${API_BASE}/projects/${projectId}/readiness`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch project readiness checklist",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProjectReadinessResponse;
	});

export function projectReadinessQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["project-readiness", projectId],
		queryFn: () => getProjectReadinessFn({ data: projectId }),
		staleTime: 30_000,
	});
}
