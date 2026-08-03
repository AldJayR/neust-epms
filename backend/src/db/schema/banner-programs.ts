import { sql } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	serial,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { campuses } from "./campuses.js";
import { departments } from "./departments.js";

export const bannerPrograms = pgTable(
	"banner_programs",
	{
		bannerProgramId: serial("banner_program_id").primaryKey(),
		campusId: integer("campus_id")
			.notNull()
			.references(() => campuses.campusId),
		departmentId: integer("department_id").references(
			() => departments.departmentId,
		),
		programName: varchar("program_name", { length: 255 }).notNull(),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		scopeNameIdx: uniqueIndex("banner_programs_scope_name_idx").on(
			table.campusId,
			sql`coalesce(${table.departmentId}, 0)`,
			sql`lower(${table.programName})`,
		),
	}),
);
