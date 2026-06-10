import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

/**
 * Departments table (e.g., CICT, Criminology, Engineering).
 * Directly linked to a campus.
 */
export const departments = pgTable("departments", {
	departmentId: serial("department_id").primaryKey(),
	departmentCode: varchar("department_code", { length: 50 }).notNull().unique(),
	departmentName: varchar("department_name", { length: 255 })
		.notNull()
		.unique(),
});
