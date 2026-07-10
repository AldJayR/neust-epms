import { z } from "@hono/zod-openapi";

export const AuditLogSchema = z
	.object({
		logId: z.string().uuid(),
		userId: z.string().uuid(),
		action: z.string(),
		tableAffected: z.string(),
		ipAddress: z.string().nullable(),
		createdAt: z.string(),
		actorName: z.string().nullable(),
		actorRole: z.string().nullable(),
	})
	.openapi("AuditLog");

export const AuditLogListSchema = z
	.object({ items: z.array(AuditLogSchema), total: z.number() })
	.openapi("AuditLogList");

export const AuditStatsSchema = z
	.object({
		totalActionsToday: z.number(),
		uniqueUsersActive: z.number(),
		accountChanges: z.number(),
		failedLogins: z.number(),
	})
	.openapi("AuditStats");

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
	search: z
		.string()
		.optional()
		.openapi({
			param: { name: "search", in: "query" },
		}),
});
