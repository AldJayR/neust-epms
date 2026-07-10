import { z } from "@hono/zod-openapi";

export const UploadResponseSchema = z
	.object({
		documentId: z.string(),
		storagePath: z.string(),
		versionNum: z.number(),
	})
	.openapi("UploadResponse");

export const DocumentListSchema = z
	.object({
		items: z.array(
			z.object({
				documentId: z.string(),
				proposalId: z.string(),
				versionNum: z.number(),
				uploadedAt: z.string(),
			}),
		),
	})
	.openapi("DocumentList");

export const PresignedUrlSchema = z
	.object({ url: z.string().url() })
	.openapi("PresignedUrl");

export const ProposalParam = z.object({
	proposalId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "proposalId", in: "path" },
		}),
});

export const DocumentParam = z.object({
	proposalId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "proposalId", in: "path" },
		}),
	documentId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "documentId", in: "path" },
		}),
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
