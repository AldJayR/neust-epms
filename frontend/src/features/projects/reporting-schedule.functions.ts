import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { API_BASE } from "@/config/api";
import { getErrorMessage } from "@/lib/api/client";
import { OPERATIONAL_ROLES } from "@/lib/permissions";
import {
	authorizeSessionUser,
	getValidAccessToken,
} from "@/lib/session.server";

import { addMonths } from "date-fns";

export interface ScheduledDueDate {
	id: string;
	title?: string | null;
	date: string;
	isCompleted: boolean;
	completedAt: string | null;
	reportType: string;
	reportId: string | null;
	storagePath: string | null;
}

export interface ProjectReportingScheduleResponse {
	schedule: {
		milestones: ScheduledDueDate[];
	};
	upcoming: { id: string; title?: string | null; date: string; reportType: string }[];
	overdue: { id: string; title?: string | null; date: string; reportType: string }[];
}

export interface DueDateEntry {
	id: string;
	title: string;
	reportType: "Progress" | "Terminal Report";
	dueDate: Date | undefined;
}

export function generateMonthlyMilestones(
	startDate: Date,
	durationMonths: number,
): DueDateEntry[] {
	const months = Math.max(1, Math.min(60, durationMonths));
	const entries: DueDateEntry[] = [];

	for (let i = 1; i <= months; i++) {
		const isLast = i === months;
		entries.push({
			id: crypto.randomUUID(),
			title: isLast
				? "Terminal Report (Accomplishment and Terminal Report)"
				: `Month ${i} Progress Report`,
			reportType: isLast ? "Terminal Report" : "Progress",
			dueDate: addMonths(startDate, i),
		});
	}

	return entries;
}

export function canSubmitMilestone(
	milestones: ScheduledDueDate[],
	index: number,
) {
	const milestone = milestones[index];
	return Boolean(
		milestone &&
			!milestone.isCompleted &&
			milestones.slice(0, index).every((previous) => previous.isCompleted),
	);
}

const getProjectReportingScheduleFn = createServerFn({ method: "GET" })
	.validator(z.uuid())
	.handler(async ({ data: projectId }) => {
		await authorizeSessionUser(...OPERATIONAL_ROLES);
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
