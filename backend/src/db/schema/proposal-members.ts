import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals.js";
import { users } from "./users.js";

export const proposalMembers = pgTable(
	"proposal_members",
	{
		memberId: uuid("member_id").primaryKey().defaultRandom(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.userId),
		projectRole: varchar("project_role", { length: 100 }).notNull(),
		addedAt: timestamp("added_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		proposalIdx: index("pm_proposal_id_idx").on(table.proposalId),
		userIdx: index("pm_user_id_idx").on(table.userId),
		activeProposalIdx: index("pm_active_proposal_id_idx")
			.on(table.proposalId)
			.where(sql`${table.archivedAt} IS NULL`),
		uniqueProposalUser: unique("pm_proposal_user_unique").on(
			table.proposalId,
			table.userId,
		),
	}),
);
