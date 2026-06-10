import {
	index,
	integer,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { departments } from "./departments.js";
import { proposals } from "./proposals.js";

/**
 * Junction table: proposals ↔ departments (many-to-many).
 * Allows multiple departments to collaborate on a single proposal.
 */
export const proposalDepartments = pgTable(
	"proposal_departments",
	{
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		departmentId: integer("department_id")
			.notNull()
			.references(() => departments.departmentId),
		addedAt: timestamp("added_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.proposalId, table.departmentId] }),
		proposalIdx: index("proposal_departments_proposal_id_idx").on(
			table.proposalId,
		),
		departmentIdx: index("proposal_departments_department_id_idx").on(
			table.departmentId,
		),
	}),
);
