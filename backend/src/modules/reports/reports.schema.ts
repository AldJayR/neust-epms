import { z } from "@hono/zod-openapi";
import { REPORT_TYPE } from "@/lib/types.js";

export const ReportSchema = z
	.object({
		reportId: z.string(),
		projectId: z.string(),
		project: z.string(),
		leader: z.string(),
		academicRank: z.string().nullable().optional(),
		avatarUrl: z.string().nullable().optional(),
		department: z.string().nullable(),
		reportType: z.string(),
		submitted: z.string(),
		storagePath: z.string().nullable(),
		remarks: z.string().nullable(),
		periodStart: z.string().nullable(),
		periodEnd: z.string().nullable(),
		archivedAt: z.string().nullable(),
	})
	.openapi("ProjectReport");

export const ReportListSchema = z
	.object({ items: z.array(ReportSchema), total: z.number() })
	.openapi("ProjectReportList");

export const CreateReportSchema = z
	.object({
		projectId: z.string().uuid(),
		reportType: z.enum([
			REPORT_TYPE.PROGRESS,
			REPORT_TYPE.FINAL_ACCOMPLISHMENT,
			REPORT_TYPE.TERMINAL,
		]),
		remarks: z.string().optional(),
		periodStart: z.string().datetime().optional(),
		periodEnd: z.string().datetime().optional(),
	})
	.openapi("CreateReport");

export const ReportStatsSchema = z
	.object({ total: z.number(), progress: z.number(), terminal: z.number() })
	.openapi("ReportStats");

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
});
