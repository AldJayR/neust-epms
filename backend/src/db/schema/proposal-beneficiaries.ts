import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { beneficiarySectors } from "./beneficiary-sectors.js";
import { proposals } from "./proposals.js";

/**
 * Junction table: proposals ↔ beneficiary_sectors (many-to-many).
 * A proposal can target multiple beneficiary sectors.
 */
export const proposalBeneficiaries = pgTable(
	"proposal_beneficiaries",
	{
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		sectorId: integer("sector_id")
			.notNull()
			.references(() => beneficiarySectors.sectorId),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.proposalId, table.sectorId] }),
		proposalIdx: index("proposal_beneficiaries_proposal_id_idx").on(
			table.proposalId,
		),
		sectorIdx: index("proposal_beneficiaries_sector_id_idx").on(table.sectorId),
		activeProposalIdx: index("proposal_beneficiaries_active_proposal_id_idx")
			.on(table.proposalId)
			.where(sql`${table.archivedAt} IS NULL`),
	}),
);
