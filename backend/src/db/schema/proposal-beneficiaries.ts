import {
  pgTable,
  uuid,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals.js";
import { beneficiarySectors } from "./beneficiary-sectors.js";

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
  },
  (table) => ({
    pk: primaryKey({ columns: [table.proposalId, table.sectorId] }),
    proposalIdx: index("proposal_beneficiaries_proposal_id_idx").on(
      table.proposalId,
    ),
    sectorIdx: index("proposal_beneficiaries_sector_id_idx").on(
      table.sectorId,
    ),
  }),
);
