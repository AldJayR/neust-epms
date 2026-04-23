import { pgTable, serial, varchar, boolean } from "drizzle-orm/pg-core";

export const campuses = pgTable("campuses", {
  campusId: serial("campus_id").primaryKey(),
  campusName: varchar("campus_name", { length: 255 }).notNull().unique(),
  isMainCampus: boolean("is_main_campus").notNull().default(false),
});
