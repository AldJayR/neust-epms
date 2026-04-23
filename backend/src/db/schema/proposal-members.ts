import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
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
  },
  (table) => ({
    proposalIdx: index("pm_proposal_id_idx").on(table.proposalId),
    userIdx: index("pm_user_id_idx").on(table.userId),
  }),
);
