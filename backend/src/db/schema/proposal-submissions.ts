import {
	index,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { proposalDocuments } from "./proposal-documents.js";
import { proposals } from "./proposals.js";
import { users } from "./users.js";

export const proposalSubmissions = pgTable(
	"proposal_submissions",
	{
		submissionId: uuid("submission_id").primaryKey().defaultRandom(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		documentId: uuid("document_id")
			.notNull()
			.references(() => proposalDocuments.documentId),
		sequence: integer("sequence").notNull(),
		submittedBy: uuid("submitted_by")
			.notNull()
			.references(() => users.userId),
		submittedAt: timestamp("submitted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		proposalIdx: index("ps_proposal_idx").on(table.proposalId),
		sequenceIdx: uniqueIndex("ps_sequence_idx").on(
			table.proposalId,
			table.sequence,
		),
	}),
);
