import { sql } from "drizzle-orm";
import {
	check,
	index,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { PROJECT_MILESTONE_KINDS } from "@/lib/milestone-types.js";
import { proposals } from "./proposals.js";
import { users } from "./users.js";

export const projectMilestones = pgTable(
	"project_milestones",
	{
		milestoneId: uuid("milestone_id").primaryKey().defaultRandom(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		kind: varchar("kind", {
			length: 50,
			enum: PROJECT_MILESTONE_KINDS,
		}).notNull(),
		actorId: uuid("actor_id").references(() => users.userId, {
			onDelete: "set null",
		}),
		sourceKey: varchar("source_key", { length: 128 }).notNull().unique(),
		occurredAt: timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		occurredIdx: index("project_milestones_occurred_idx").on(
			table.occurredAt,
			table.milestoneId,
		),
		proposalIdx: index("project_milestones_proposal_idx").on(table.proposalId),
		kindCheck: check(
			"project_milestones_kind_check",
			sql`${table.kind} IN ('proposal_endorsed', 'proposal_approved', 'proposal_returned', 'proposal_rejected', 'signed_documents_completed', 'project_activated', 'terminal_package_completed', 'project_completed')`,
		),
	}),
);
