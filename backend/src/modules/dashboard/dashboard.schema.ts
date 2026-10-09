import { z } from "@hono/zod-openapi";
import { currentManilaYear, ProjectYearSchema } from "@/lib/project-period.js";

export const PeriodMetadataSchema = z.object({
	availableYears: z.array(z.number().int()),
});
export const PeriodChartPointSchema = z.object({
	month: z.string(),
	campusId: z.number(),
	campusName: z.string(),
	value: z.number(),
});
export const DashboardYearQuery = z.object({
	year: ProjectYearSchema.optional(),
});
export const FacultyDashboardQuery = z.object({
	year: ProjectYearSchema.default(() => currentManilaYear()),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});
export const DashboardItemSchema = z.object({
	proposalId: z.string().uuid(),
	title: z.string(),
	status: z.string(),
	projectId: z.string().uuid().nullable(),
	targetStartDate: z.string().nullable(),
	targetEndDate: z.string().nullable(),
	createdAt: z.string(),
	isLeader: z.boolean(),
});
export const FacultyDashboardSchema = PeriodMetadataSchema.extend({
	metrics: z.object({
		totalSubmissions: z.number(),
		ongoingProjects: z.number(),
		proposals: z.number(),
	}),
	items: z.array(DashboardItemSchema),
	total: z.number(),
});
