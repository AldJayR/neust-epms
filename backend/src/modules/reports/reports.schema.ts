import { z } from "@hono/zod-openapi";

export const ReportSchema = z
	.object({
		reportId: z.string(),
		projectId: z.string(),
		milestoneId: z.string(),
		project: z.string(),
		leader: z.string(),
		academicRank: z.string().nullable().optional(),
		avatarUrl: z.string().nullable().optional(),
		department: z.string().nullable(),
		reportType: z.string(),
		submitted: z.string().nullable(),
		traineeCount: z.number().int().nonnegative().nullable(),
		packageCompletedAt: z.string().nullable(),
		storagePath: z.string().nullable(),
		remarks: z.string().nullable(),
		archivedAt: z.string().nullable(),
	})
	.openapi("ProjectReport");

export const ReportListSchema = z
	.object({ items: z.array(ReportSchema), total: z.number() })
	.openapi("ProjectReportList");

export const CreateReportSchema = z
	.object({
		milestoneId: z.string().uuid(),
		reportType: z.enum([
			"Progress",
			"Progress Report",
			"Terminal",
			"Final Accomplishment",
			"Accomplishment and Terminal Report",
		]),
		remarks: z.string().optional(),
		traineeCount: z.number().int().min(0).max(2147483647).optional(),
	})
	.superRefine((value, context) => {
		if (
			value.reportType === "Accomplishment and Terminal Report" &&
			value.traineeCount === undefined
		) {
			context.addIssue({
				code: "custom",
				path: ["traineeCount"],
				message: "Number of trainees is required for terminal reports",
			});
		}
		if (
			["Progress", "Progress Report"].includes(value.reportType) &&
			value.traineeCount !== undefined
		) {
			context.addIssue({
				code: "custom",
				path: ["traineeCount"],
				message: "Trainee counts belong to terminal reports",
			});
		}
	})
	.openapi("CreateReport");

export const ReportPackageSchema = z.object({
	reportId: z.string().uuid().nullable(),
	reportType: z.string().nullable(),
	remarks: z.string().nullable(),
	traineeCount: z.number().int().nullable(),
	evaluationAttachmentId: z.string().uuid().nullable(),
	attendanceAttachmentId: z.string().uuid().nullable(),
	documentUploaded: z.boolean(),
	evaluationUploaded: z.boolean(),
	attendanceUploaded: z.boolean(),
	completed: z.boolean(),
	canEdit: z.boolean(),
});

export const ReportAttachmentSchema = z
	.object({
		attachmentId: z.string(),
		reportId: z.string(),
		attachmentType: z.string(),
		storagePath: z.string(),
		uploadedAt: z.string(),
	})
	.openapi("ReportAttachment");

export const ReportAttachmentListSchema = z
	.array(ReportAttachmentSchema)
	.openapi("ReportAttachmentList");

export const ReportStatsSchema = z
	.object({ total: z.number(), progress: z.number(), terminal: z.number() })
	.openapi("ReportStats");

export const SignedUrlSchema = z
	.object({ url: z.string().url() })
	.openapi("ReportSignedUrl");

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
		.openapi({ param: { name: "page", in: "query" } }),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({ param: { name: "limit", in: "query" } }),
	search: z
		.string()
		.trim()
		.min(1)
		.optional()
		.openapi({ param: { name: "search", in: "query" } }),
});
