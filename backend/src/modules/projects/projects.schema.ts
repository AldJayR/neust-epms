import { z } from "@hono/zod-openapi";

// ── Response schemas ──

export const ProjectSchema = z
	.object({
		projectId: z.string().uuid(),
		proposalId: z.string().uuid(),
		moaId: z.string().uuid().nullable(),
		title: z.string().optional(),
		extensionCategory: z.string().optional(),
		targetStartDate: z.string().nullable(),
		targetEndDate: z.string().nullable(),
		actualEndDate: z.string().nullable(),
		projectStatus: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
		leaderFirstName: z.string().nullable().optional(),
		leaderLastName: z.string().nullable().optional(),
		leaderAcademicRank: z.string().nullable().optional(),
		isMember: z.boolean().optional(),
	})
	.openapi("Project");

export const ProjectListSchema = z
	.object({ items: z.array(ProjectSchema), total: z.number() })
	.openapi("ProjectList");

export const ProjectDerivedStateSchema = z
	.object({
		state: z.enum(["ACT", "WAIT", "WATCH"]),
		owner: z.string(),
		reason: z.string(),
		nextTransition: z.string(),
	})
	.openapi("ProjectDerivedState");

export const ProjectDetailsMemberSchema = z.object({
	memberId: z.string(),
	userId: z.string(),
	name: z.string(),
	role: z.string(),
	avatarUrl: z.string().nullable().optional(),
	specialOrder: z
		.object({
			specialOrderId: z.string(),
			soNumber: z.string(),
			storagePath: z.string().nullable(),
			dateIssued: z.string().nullable(),
			status: z.string(),
		})
		.nullable()
		.optional(),
});

export const ProjectDetailsHistoryItemSchema = z.object({
	id: z.string(),
	version: z.string(),
	status: z.string(),
	actorName: z.string(),
	date: z.string(),
	comment: z.string().optional(),
});

export const ProjectDetailsAttachmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	url: z.string(),
	version: z.string(),
});

export const ProjectDetailsSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.string(),
	version: z.string(),
	bypassedRetChair: z.boolean(),
	metadata: z.object({
		leader: z.object({
			name: z.string(),
		}),
		departmentCode: z.string(),
		department: z.string(),
		duration: z.string(),
		moaLinked: z.string(),
		sdgs: z.string().optional(),
		budget: z.object({
			total: z.number(),
			neust: z.number(),
			partner: z.number(),
		}),
	}),
	members: z.array(ProjectDetailsMemberSchema),
	history: z.array(ProjectDetailsHistoryItemSchema),
	attachments: z.array(ProjectDetailsAttachmentSchema),
});

export const ProjectReadinessSchema = z
	.object({
		isReady: z.boolean(),
		prerequisites: z.array(
			z.object({
				name: z.string(),
				complete: z.boolean(),
				owner: z.string(),
				details: z.string(),
			}),
		),
		blocker: z.string().nullable(),
	})
	.openapi("ProjectReadiness");

export const ProjectReportingScheduleSchema = z
	.object({
		schedule: z.object({
			frequency: z.string(),
			dueDates: z.array(
				z.object({
					id: z.string(),
					date: z.string(),
					isCompleted: z.boolean(),
					completedAt: z.string().nullable(),
					reportType: z.string(),
					reportId: z.string().nullable(),
					storagePath: z.string().nullable(),
				}),
			),
		}),
		upcoming: z.array(
			z.object({
				id: z.string(),
				date: z.string(),
				reportType: z.string(),
			}),
		),
		overdue: z.array(
			z.object({
				id: z.string(),
				date: z.string(),
				reportType: z.string(),
			}),
		),
	})
	.openapi("ProjectReportingSchedule");

// ── Request schemas ──

export const CreateProjectSchema = z
	.object({
		proposalId: z.string(),
	})
	.openapi("CreateProject");

export const LinkMoaSchema = z.object({ moaId: z.string() }).openapi("LinkMoa");

export const TransitionSchema = z
	.object({ status: z.enum(["Ongoing", "Completed"]) })
	.openapi("TransitionProject");

export const ParamId = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: "id", in: "path" } }),
});

export const PaginationQuery = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({
			param: { name: "limit", in: "query" },
		}),
	archived: z
		.string()
		.optional()
		.openapi({
			param: { name: "archived", in: "query" },
		}),
});

export const ActivateSchema = z
	.object({
		moaId: z.string().uuid(),
		reportingFrequency: z.enum(["Monthly", "Quarterly", "Semestral", "Custom"]),
		dueDates: z.array(
			z.object({
				reportType: z.string().min(1),
				dueDate: z.string().datetime(),
			}),
		),
	})
	.openapi("ActivateProject");
