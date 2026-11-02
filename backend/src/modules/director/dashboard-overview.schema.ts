import { z } from "@hono/zod-openapi";
import { ProjectYearSchema } from "@/lib/project-period.js";

export const OverviewQuerySchema = z.object({
	year: ProjectYearSchema,
	campusId: z.coerce.number().int().positive().optional(),
	departmentId: z.coerce.number().int().nonnegative().optional(),
});

export const WorkQueueSchema = z.enum([
	"review",
	"signing",
	"activation",
	"completion",
	"reports",
]);
export const WorkQueueQuerySchema = z.object({
	queue: WorkQueueSchema.default("review"),
	page: z.coerce.number().int().min(1).max(100000).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(5),
});

const ProjectCountsSchema = z.object({
	totalProjects: z.number(),
	activeProjects: z.number(),
	ongoingProjects: z.number(),
	overdueProjects: z.number(),
	pendingCompletionProjects: z.number(),
	completedProjects: z.number(),
});
const FacultyCountsSchema = z.object({
	faculty: z.number(),
	leaders: z.number(),
	collaborators: z.number(),
});
export const DirectorOverviewSchema = z.object({
	metrics: ProjectCountsSchema.extend({ submittedProposals: z.number() }),
	departments: z.array(
		ProjectCountsSchema.extend({
			departmentId: z.number().nullable(),
			name: z.string(),
			code: z.string(),
			faculty: z.number(),
			leaders: z.number(),
			collaborators: z.number(),
		}),
	),
	departmentOptions: z.array(z.object({ id: z.number(), name: z.string() })),
	proposalStages: z.array(z.object({ status: z.string(), count: z.number() })),
	faculty: FacultyCountsSchema,
	chartMonths: z.array(z.string()),
	chartData: z.array(
		z.object({
			month: z.string(),
			campusId: z.number(),
			campusName: z.string(),
			value: z.number(),
		}),
	),
});

export const WorkQueueResponseSchema = z.object({
	overdueReports: z.number(),
	counts: z.object({
		review: z.number(),
		signing: z.number(),
		activation: z.number(),
		completion: z.number(),
		reports: z.number(),
	}),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	items: z.array(
		z.object({
			id: z.string(),
			proposalId: z.string(),
			projectId: z.string().nullable(),
			title: z.string(),
			department: z.string(),
			leader: z.string(),
			status: z.string(),
			since: z.string().nullable(),
			dueAt: z.string().nullable(),
			overdue: z.boolean(),
			missingRequirements: z.array(z.string()),
		}),
	),
});
