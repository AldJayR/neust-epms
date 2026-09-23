import { sql } from "drizzle-orm";
import {
	boolean,
	integer,
	pgTable,
	serial,
	text,
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
		programCode: varchar("program_code", { length: 50 }),
		unitScope: varchar("unit_scope", { length: 50 }),
		programName: varchar("program_name", { length: 255 }).notNull(),
		description: text("description"),
		campusId: integer("campus_id")
			.notNull()
			.references(() => campuses.campusId),
		departmentId: integer("department_id").references(
			() => departments.departmentId,
		),
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
		unitScopeNameIdx: uniqueIndex("banner_programs_unit_scope_name_idx")
			.on(table.unitScope, sql`lower(${table.programName})`)
			.where(sql`${table.unitScope} IS NOT NULL`),
	}),
);
