import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals.js";
import { moas } from "./moas.js";

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
    startDate: timestamp("start_date", { withTimezone: true }),
    targetEnd: timestamp("target_end", { withTimezone: true }),
    projectStatus: varchar("project_status", { length: 50 })
      .notNull()
      .default("Approved"),
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
