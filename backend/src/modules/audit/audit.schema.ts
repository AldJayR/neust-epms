import { z } from "@hono/zod-openapi";
import { AUDIT_ACTION_TYPES } from "./audit-filters.js";

export const AuditValueSchema = z.record(z.string(), z.any()).nullable();

export const AuditLogSchema = z
	.object({
		logId: z.string().uuid(),
		userId: z.string().uuid(),
		action: z.string(),
		actionType: z.enum(AUDIT_ACTION_TYPES).optional(),
		tableAffected: z.string(),
		oldValue: AuditValueSchema,
		newValue: AuditValueSchema,
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
		.string().trim().max(200)
		.optional()
		.openapi({
			param: { name: "search", in: "query" },
		}),
	actionType: z.enum(AUDIT_ACTION_TYPES).optional(),
	action: z.string().trim().max(255).optional(),
	module: z.string().trim().max(100).optional(),
	userId: z.string().uuid().optional(),
	dateFrom: z.string().date().optional(),
	dateTo: z.string().date().optional(),
}).refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
	message: "The start date must not be after the end date", path: ["dateTo"],
});

export const AuditFilterOptionsSchema = z.object({
	users: z.array(z.object({ userId: z.string().uuid(), name: z.string(), email: z.string() })),
	modules: z.array(z.string()),
});
