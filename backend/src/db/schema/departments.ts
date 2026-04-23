import { pgTable, serial, integer, varchar, index } from "drizzle-orm/pg-core";
import { campuses } from "./campuses.js";

/**
 * Departments table (e.g., CICT, Criminology, Engineering).
 * Directly linked to a campus.
 */
export const departments = pgTable(
  "departments",
  {
    departmentId: serial("department_id").primaryKey(),
    campusId: integer("campus_id")
      .notNull()
      .references(() => campuses.campusId),
    departmentName: varchar("department_name", { length: 255 })
      .notNull()
      .unique(),
  },
  (table) => ({
    campusIdx: index("departments_campus_id_idx").on(table.campusId),
  }),
);
