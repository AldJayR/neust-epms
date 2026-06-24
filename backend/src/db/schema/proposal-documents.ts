import {
	index,
	integer,
	pgTable,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals.js";

/**
 * Versioned proposal documents.
 * EC-04: Old versions are preserved as read-only when a proposal is returned for revision.
 */
export const proposalDocuments = pgTable(
	"proposal_documents",
	{
		documentId: uuid("document_id").primaryKey().defaultRandom(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		storagePath: varchar("storage_path", { length: 500 }).notNull(),
		versionNum: integer("version_num").notNull(),
		uploadedAt: timestamp("uploaded_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		proposalIdx: index("pd_proposal_id_idx").on(table.proposalId),
		proposalVersionUnique: unique("pd_proposal_version_unique").on(
			table.proposalId,
			table.versionNum,
		),
	}),
);
