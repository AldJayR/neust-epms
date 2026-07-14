import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

export interface ActionItem {
	id: string;
	dateId?: string;
	type: "proposal" | "project" | "moa" | "report" | "registration";
	title: string;
	status: string;
	actionRequired: string;
	owner: string;
	derivedState: "ACT" | "WAIT" | "WATCH";
	createdAt: string;
	urgency: "urgent" | "soon" | "routine";
}

export interface ActionCenterResponse {
	actItems: ActionItem[];
	watchItems: ActionItem[];
	stats: {
		pendingReviews: number;
		returnedProposals: number;
		overdueReports: number;
		expiringMoas: number;
		projectsNeedingActivation: number;
	};
}

const getActionCenterFn = createServerFn({ method: "GET" })
	.validator(z.void())
	.handler(async () => {
		await authorizeSessionUser(
			"Faculty",
			"RET Chair",
			"Director",
			"Super Admin",
		);
		const token = await getValidAccessToken();

		const response = await fetch(`${API_BASE}/action-center`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch action center",
			);
			throw new Error(message);
		}

		return (await response.json()) as ActionCenterResponse;
	});

export function actionCenterQueryOptions() {
	return queryOptions({
		queryKey: ["action-center"],
		queryFn: () => getActionCenterFn(),
		staleTime: 30_000,
	});
}
