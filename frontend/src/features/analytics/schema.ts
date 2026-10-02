import { z } from "zod";

export const analyticsViews = ["reach", "participation", "coverage"] as const;
export type AnalyticsView = (typeof analyticsViews)[number];
export const analyticsSearchSchema = z.object({
	year: z.coerce
		.number()
		.int()
		.min(2000)
		.max(2200)
		.default(() => new Date().getFullYear()),
	campusId: z.coerce.number().int().positive().optional(),
	departmentId: z.coerce.number().int().positive().optional(),
	groupBy: z.enum(["program", "sector", "sdg", "service"]).default("program"),
	category: z.string().max(100).optional(),
	facultyId: z.string().uuid().optional(),
	missing: z.enum(["true", "false"]).default("false"),
	page: z.coerce.number().int().min(1).max(100000).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const analyticsItemSchema = z.object({
	id: z.string(),
	label: z.string(),
	campus: z.string().nullable(),
	department: z.string().nullable(),
	proposalId: z.string().nullable(),
	reportId: z.string().nullable(),
	userId: z.string().nullable(),
	status: z.string().nullable(),
	closedAt: z.string().nullable(),
	traineeCount: z.number().nullable(),
	projects: z.number(),
	lead: z.number(),
	collaboration: z.number(),
});
export const analyticsResponseSchema = z.object({
	undatedProjects: z.number().int().nonnegative().default(0),
	metrics: z.array(
		z.object({
			label: z.string(),
			value: z.number().nullable(),
			description: z.string(),
		}),
	),
	groups: z.array(
		z.object({
			key: z.string(),
			label: z.string(),
			projects: z.number(),
			trainees: z.number().nullable(),
			recorded: z.number(),
			missing: z.number(),
		}),
	),
	items: z.array(analyticsItemSchema),
	total: z.number(),
	dateBasis: z.string(),
	scopeLabel: z.string(),
	generatedAt: z.string(),
});
export type AnalyticsFilters = z.infer<typeof analyticsSearchSchema>;
export type AnalyticsItem = z.infer<typeof analyticsItemSchema>;
