import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

/**
 * Lookup table for target beneficiary sectors (e.g., "Farmers", "Youth", "Senior Citizens").
 */
export const beneficiarySectors = pgTable("beneficiary_sectors", {
  sectorId: serial("sector_id").primaryKey(),
  sectorName: varchar("sector_name", { length: 255 }).notNull().unique(),
});
