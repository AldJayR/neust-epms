import { z } from "@hono/zod-openapi";

export const MoaSchema = z
	.object({
		moaId: z.string(),
		partnerId: z.string(),
		storagePath: z.string().nullable(),
		validFrom: z.string(),
		validUntil: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
	})
	.openapi("Moa");

export const MoaDetailSchema = z
	.object({
		moaId: z.string(),
		partnerId: z.string(),
		partnerName: z.string(),
		storagePath: z.string().nullable(),
		validFrom: z.string(),
		validUntil: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
		status: z.enum(["Valid", "Renewal Needed", "Expired"]),
		daysToExpiry: z.union([z.number(), z.literal("Expired")]),
	})
	.openapi("MoaDetail");

export const MoaLinkedProjectSchema = z
	.object({
		projectId: z.string(),
		title: z.string(),
		projectStatus: z.string(),
		leaderName: z.string().nullable(),
		createdAt: z.string(),
	})
	.openapi("MoaLinkedProject");

export const MoaListSchema = z
	.object({ items: z.array(MoaSchema), total: z.number() })
	.openapi("MoaList");

export const UpdateMoaSchema = z
	.object({
		partnerId: z.string().uuid().optional(),
		validFrom: z.string().datetime().optional(),
		validUntil: z.string().datetime().optional(),
	})
	.openapi("UpdateMoa");

export const MoaPaginationQuery = z.object({
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
