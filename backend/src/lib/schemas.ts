import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
	.object({
		error: z.object({ code: z.string(), message: z.string() }),
	})
	.openapi("Error");

export const MessageSchema = z
	.object({ message: z.string() })
	.openapi("Message");

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
