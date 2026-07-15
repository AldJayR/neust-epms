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
import { users } from "./users.js";

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
		contentHash: varchar("content_hash", { length: 64 }),
		uploadedBy: uuid("uploaded_by").references(() => users.userId),
		sourceIp: varchar("source_ip", { length: 45 }),
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
