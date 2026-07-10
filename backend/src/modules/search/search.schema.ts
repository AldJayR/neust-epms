import { z } from "@hono/zod-openapi";

export const SEARCH_TYPE = z
	.enum(["all", "proposals", "projects", "reports", "moas", "users"])
	.default("all");

export const SearchQuerySchema = z.object({
	q: z
		.string()
		.trim()
		.min(1)
		.max(100)
		.openapi({
			param: { name: "q", in: "query" },
			description: "Free-text search term",
		}),
	type: SEARCH_TYPE.openapi({
		param: { name: "type", in: "query" },
		description: "Entity type to search (default: all)",
	}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(20)
		.default(5)
		.openapi({
			param: { name: "limit", in: "query" },
			description: "Max results per entity type",
		}),
});

export const SearchResultItemSchema = z.object({
	type: z.enum(["proposals", "projects", "reports", "moas", "users"]),
	id: z.string().uuid(),
	title: z.string(),
	subtitle: z.string().nullable(),
});

export const SearchResponseSchema = z.object({
	results: z.array(SearchResultItemSchema),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export type SearchKind = z.infer<typeof SEARCH_TYPE>;
