import {
	pgTable,
	uuid,
	integer,
	varchar,
	numeric,
	boolean,
	timestamp,
	index,
} from "drizzle-orm/pg-core";
import { campuses } from "./campuses.js";
import { departments } from "./departments.js";

/**
 * Proposals table.
 * - department_id: the lead department that submitted the proposal.
 * - campus_id: the campus where the proposal originates.
 * - Collaborating departments are tracked via proposal_departments junction.
 * - Beneficiaries and SDGs are tracked via their own junction tables.
 */
export const proposals = pgTable(
	"proposals",
	{
		proposalId: uuid("proposal_id").primaryKey().defaultRandom(),
		campusId: integer("campus_id")
			.notNull()
			.references(() => campuses.campusId),
		departmentId: integer("department_id")
			.notNull()
			.references(() => departments.departmentId),
		title: varchar("title", { length: 500 }).notNull(),
		bannerProgram: varchar("banner_program", { length: 255 }).notNull(),
		projectLocale: varchar("project_locale", { length: 255 }).notNull(),
		extensionCategory: varchar("extension_category", {
			length: 100,
		}).notNull(),
		budgetPartner: numeric("budget_partner", {
			precision: 14,
			scale: 2,
		}).default("0"),
		budgetNeust: numeric("budget_neust", {
			precision: 14,
			scale: 2,
		}).default("0"),
		status: varchar("status", { length: 50 }).notNull().default("Draft"),
		bypassedRetChair: boolean("bypassed_ret_chair").notNull().default(false),
		revisionNum: integer("revision_num").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		campusIdx: index("proposals_campus_id_idx").on(table.campusId),
		departmentIdx: index("proposals_department_id_idx").on(table.departmentId),
		statusIdx: index("proposals_status_idx").on(table.status),
	}),
);
