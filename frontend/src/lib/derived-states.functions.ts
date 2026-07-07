import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "./auth.functions";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

export interface DerivedStateResponse {
	state: "ACT" | "WAIT" | "WATCH";
	owner: string;
	reason: string;
	nextTransition: string;
}

const getProposalDerivedStateFn = createServerFn({ method: "GET" })
	.validator(z.string().uuid())
	.handler(async ({ data: proposalId }) => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const token = await getValidAccessToken();

		const response = await fetch(
			`${API_BASE}/proposals/${proposalId}/derived-state`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch proposal derived state",
			);
			throw new Error(message);
		}

		return (await response.json()) as DerivedStateResponse;
	});

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

export function proposalDerivedStateQueryOptions(proposalId: string) {
	return queryOptions({
		queryKey: ["proposal-derived-state", proposalId],
		queryFn: () => getProposalDerivedStateFn({ data: proposalId }),
		staleTime: 30_000,
	});
}

export function projectDerivedStateQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["project-derived-state", projectId],
		queryFn: () => getProjectDerivedStateFn({ data: projectId }),
		staleTime: 30_000,
	});
}
