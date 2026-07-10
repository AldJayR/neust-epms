import { z } from "@hono/zod-openapi";

export const SpecialOrderSchema = z
	.object({
		specialOrderId: z.string(),
		memberId: z.string(),
		soNumber: z.string(),
		storagePath: z.string().nullable(),
		dateIssued: z.string().nullable(),
		status: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
	})
	.openapi("SpecialOrder");

export const SpecialOrderListSchema = z
	.object({ items: z.array(SpecialOrderSchema) })
	.openapi("SpecialOrderList");

export const SignedUrlSchema = z
	.object({ url: z.string().url() })
	.openapi("SignedUrl");

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
});
