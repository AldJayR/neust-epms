import { pgTable, serial, integer, varchar } from "drizzle-orm/pg-core";

/**
 * UN Sustainable Development Goals lookup table (17 goals).
 */
export const sdgs = pgTable("sdgs", {
  sdgId: serial("sdg_id").primaryKey(),
  sdgNumber: integer("sdg_number").notNull().unique(),
  sdgTitle: varchar("sdg_title", { length: 255 }).notNull(),
});
