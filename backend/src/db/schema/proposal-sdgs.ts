import {
  pgTable,
  uuid,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals.js";
import { sdgs } from "./sdgs.js";

/**
 * Junction table: proposals ↔ SDGs (many-to-many).
 * A proposal can align with multiple Sustainable Development Goals.
 */
export const proposalSdgs = pgTable(
  "proposal_sdgs",
  {
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.proposalId),
    sdgId: integer("sdg_id")
      .notNull()
      .references(() => sdgs.sdgId),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.proposalId, table.sdgId] }),
    proposalIdx: index("proposal_sdgs_proposal_id_idx").on(table.proposalId),
    sdgIdx: index("proposal_sdgs_sdg_id_idx").on(table.sdgId),
  }),
);
