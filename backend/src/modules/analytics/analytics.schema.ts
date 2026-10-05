import { z } from "@hono/zod-openapi";

export const AnalyticsQuery = z.object({
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
export const AnalyticsParams = z.object({
	view: z.enum(["reach", "participation", "coverage"]),
});
const AnalyticsRowBase = z.object({
	id: z.string(),
	label: z.string(),
	campus: z.string().nullable(),
	department: z.string().nullable(),
});
export const ProjectAnalyticsItem = AnalyticsRowBase.extend({
	kind: z.literal("project"),
	proposalId: z.string(),
	reportId: z.string().nullable(),
	status: z.string(),
	closedAt: z.string().nullable(),
	traineeCount: z.coerce.number().nullable(),
	projectRole: z.enum(["Project Leader", "Collaborator"]).nullable(),
});
export const FacultyAnalyticsItem = AnalyticsRowBase.extend({
	kind: z.literal("faculty"),
	userId: z.string(),
	projects: z.coerce.number(),
	lead: z.coerce.number(),
	collaboration: z.coerce.number(),
});
export const AnalyticsItem = z.discriminatedUnion("kind", [
	ProjectAnalyticsItem,
	FacultyAnalyticsItem,
]);
export const AnalyticsResponse = z.object({
	undatedProjects: z.number().int().nonnegative(),
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
			projects: z.coerce.number(),
			trainees: z.coerce.number().nullable(),
			recorded: z.coerce.number(),
			missing: z.coerce.number(),
		}),
	),
	items: z.array(AnalyticsItem),
	total: z.number(),
	dateBasis: z.string(),
	scopeLabel: z.string(),
	generatedAt: z.string(),
});
export type AnalyticsFilters = z.infer<typeof AnalyticsQuery>;
export type AnalyticsView = z.infer<typeof AnalyticsParams>["view"];
