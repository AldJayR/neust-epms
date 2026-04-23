import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { proposals } from "./proposals.js";
import { users } from "./users.js";

/**
 * Proposal reviews — stores endorsement/approval decisions.
 * EC-05: Each review is a new entry; prior entries are never overwritten.
 */
export const proposalReviews = pgTable(
  "proposal_reviews",
  {
    reviewId: uuid("review_id").primaryKey().defaultRandom(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.proposalId),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.userId),
    reviewStage: varchar("review_stage", { length: 50 }).notNull(),
    decision: varchar("decision", { length: 50 }).notNull(),
    comments: text("comments"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    proposalIdx: index("pr_proposal_id_idx").on(table.proposalId),
    reviewerIdx: index("pr_reviewer_id_idx").on(table.reviewerId),
  }),
);
