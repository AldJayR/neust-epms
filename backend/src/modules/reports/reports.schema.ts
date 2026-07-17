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
		submitted: z.string(),
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
		reportType: z.enum(["Progress", "Terminal", "Final Accomplishment"]),
		remarks: z.string().optional(),
	})
	.openapi("CreateReport");

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
