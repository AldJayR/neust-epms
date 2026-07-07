import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getErrorMessage } from "./auth.functions";
import { authorizeSessionUser, getValidAccessToken } from "./session.server";

const API_BASE = process.env.API_URL ?? "http://localhost:3001/api/v1";

export interface ScheduledDueDate {
	id: string;
	date: string;
	isCompleted: boolean;
	completedAt: string | null;
	reportType: string;
	reportId: string | null;
	storagePath: string | null;
}

export interface ProjectReportingScheduleResponse {
	schedule: {
		frequency: string;
		dueDates: ScheduledDueDate[];
	};
	upcoming: { id: string; date: string; reportType: string }[];
	overdue: { id: string; date: string; reportType: string }[];
}

const getProjectReportingScheduleFn = createServerFn({ method: "GET" })
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
			`${API_BASE}/projects/${projectId}/reporting-schedule`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const message = await getErrorMessage(
				response,
				"Failed to fetch reporting schedule",
			);
			throw new Error(message);
		}

		return (await response.json()) as ProjectReportingScheduleResponse;
	});

export function projectReportingScheduleQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: ["project-reporting-schedule", projectId],
		queryFn: () => getProjectReportingScheduleFn({ data: projectId }),
		staleTime: 30_000,
	});
}
