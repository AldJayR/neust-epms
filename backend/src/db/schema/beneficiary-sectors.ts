import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { normalizedSectorKey } from "../sector-normalization.js";

/**
 * Lookup table for target beneficiary sectors (e.g., "Farmers", "Youth", "Senior Citizens").
 */
export const beneficiarySectors = pgTable(
	"beneficiary_sectors",
	{
		sectorId: serial("sector_id").primaryKey(),
		sectorName: varchar("sector_name", { length: 255 }).notNull().unique(),
		// PostgreSQL is authoritative for identity; clients only normalize for UX.
		normalizedKey: text("normalized_key")
			.notNull()
			.generatedAlwaysAs(normalizedSectorKey(sql`"sector_name"`)),
		// Retain superseded IDs/names as migration provenance and resolve old IDs.
		mergedIntoId: integer("merged_into_id").references(
			(): AnyPgColumn => beneficiarySectors.sectorId,
		),
	},
	(table) => [
		uniqueIndex("beneficiary_sectors_normalized_key_unique")
			.on(table.normalizedKey)
			.where(sql`${table.mergedIntoId} IS NULL`),
		index("beneficiary_sectors_search_idx")
			.using("gin", table.normalizedKey.op("gin_trgm_ops"))
			.where(sql`${table.mergedIntoId} IS NULL`),
		check("beneficiary_sectors_nonempty", sql`${table.normalizedKey} <> ''`),
		check(
			"beneficiary_sectors_not_self_merged",
			sql`${table.mergedIntoId} IS NULL OR ${table.mergedIntoId} <> ${table.sectorId}`,
		),
	],
);
