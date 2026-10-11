import { z } from "zod";

export const MAX_SECTOR_LABEL_LENGTH = 255;

/** PostgreSQL varchar limits Unicode characters, not UTF-16 code units. */
export function sectorLabelLength(label: string) {
	return [...label].length;
}

const sectorLabelSchema = z
	.string()
	.refine((label) => label.trim().length > 0, "Enter a beneficiary sector")
	.refine(
		(label) => sectorLabelLength(label) <= MAX_SECTOR_LABEL_LENGTH,
		"Sector names must contain at most 255 characters",
	);

export const sectorSelectionSchema = z.object({
	sectorId: z.number().int().positive().optional(),
	sectorName: sectorLabelSchema,
	enteredLabels: z.array(sectorLabelSchema).optional(),
});

export type SectorSelection = z.infer<typeof sectorSelectionSchema>;

export const sectorSearchResponseSchema = z.object({
	items: z.array(
		z.object({
			sectorId: z.number().int().positive(),
			sectorName: z.string(),
			isExact: z.boolean(),
		}),
	),
});

export type SectorSearchItem = z.infer<
	typeof sectorSearchResponseSchema
>["items"][number];

/** UI-only duplicate detection. PostgreSQL remains authoritative on save. */
export function normalizeSectorLabel(label: string) {
	// Use ordinary whitespace, not JS \s (which also removes meaningful U+FEFF).
	return label
		.replace(/[ \t\n\v\f\r]+/g, " ")
		.replace(/^ +| +$/g, "")
		.toLowerCase();
}

export function sameSector(a: SectorSelection, b: SectorSelection) {
	return (
		(a.sectorId !== undefined &&
			b.sectorId !== undefined &&
			a.sectorId === b.sectorId) ||
		normalizeSectorLabel(a.sectorName) === normalizeSectorLabel(b.sectorName)
	);
}
