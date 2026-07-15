import {
	boolean,
	index,
	pgTable,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { moas } from "./moas.js";
import { proposals } from "./proposals.js";

/**
 * Projects — 1:1 with proposals.
 * SYS-REQ-04.1: A project cannot transition to "Ongoing" without an active moa_id.
 */
export const projects = pgTable(
	"projects",
	{
		projectId: uuid("project_id").primaryKey().defaultRandom(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		moaId: uuid("moa_id").references(() => moas.moaId),
		actualEndDate: timestamp("actual_end_date", { withTimezone: true }),
		projectStatus: varchar("project_status", { length: 50 })
			.notNull()
			.default("Approved"),
		onHold: boolean("on_hold").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		proposalUnique: unique("projects_proposal_id_unique").on(table.proposalId),
		moaIdx: index("projects_moa_id_idx").on(table.moaId),
	}),
);
