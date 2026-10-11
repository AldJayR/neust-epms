import { z } from "@hono/zod-openapi";

// Keep original text intact; display/identity normalization belongs to PostgreSQL.
export const SectorLabelSchema = z
	.string()
	.refine((label) => label.trim().length > 0, "Enter a beneficiary sector")
	.refine(
		(label) => [...label].length <= 255,
		"Sector names must contain at most 255 characters",
	);

export const SectorSelectionSchema = z.object({
	sectorId: z.number().int().positive().optional(),
	sectorName: SectorLabelSchema,
	enteredLabels: z.array(SectorLabelSchema).optional(),
});

export type SectorSelection = z.infer<typeof SectorSelectionSchema>;

export const SectorSearchQuerySchema = z.object({
	q: z
		.string()
		.refine(
			(query) => [...query].length <= 255,
			"Search must contain at most 255 characters",
		)
		.default(""),
});

export const SectorSearchResponseSchema = z.object({
	items: z.array(
		z.object({
			sectorId: z.number().int().positive(),
			sectorName: z.string(),
			isExact: z.boolean(),
		}),
	),
});
