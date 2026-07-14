import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";
import type { DerivedStateResponse } from "@/types/derived-state";

const getProposalDerivedStateFn = createServerFn({ method: "GET" })
	.validator(z.uuid())
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

export function proposalDerivedStateQueryOptions(proposalId: string) {
	return queryOptions({
		queryKey: ["proposal-derived-state", proposalId],
		queryFn: () => getProposalDerivedStateFn({ data: proposalId }),
		staleTime: 30_000,
	});
}

export type { DerivedStateResponse } from "@/types/derived-state";
