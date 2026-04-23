import {
  pgTable,
  uuid,
  integer,
  varchar,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { campuses } from "./campuses.js";
import { departments } from "./departments.js";

/**
 * Proposals table.
 * - department_id: the lead department that submitted the proposal.
 * - campus_id: the campus where the proposal originates.
 * - Collaborating departments are tracked via proposal_departments junction.
 * - Beneficiaries and SDGs are tracked via their own junction tables.
 */
export const proposals = pgTable(
  "proposals",
  {
    proposalId: uuid("proposal_id").primaryKey().defaultRandom(),
    projectLeaderId: uuid("project_leader_id")
      .notNull()
      .references(() => users.userId),
    campusId: integer("campus_id")
      .notNull()
      .references(() => campuses.campusId),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.departmentId),
    title: varchar("title", { length: 500 }).notNull(),
    bannerProgram: varchar("banner_program", { length: 255 }).notNull(),
    projectLocale: varchar("project_locale", { length: 255 }).notNull(),
    extensionCategory: varchar("extension_category", {
      length: 100,
    }).notNull(),
    extensionAgenda: varchar("extension_agenda", { length: 255 }).notNull(),
    budgetPartner: numeric("budget_partner", {
      precision: 14,
      scale: 2,
    }).default("0"),
    budgetNeust: numeric("budget_neust", {
      precision: 14,
      scale: 2,
    }).default("0"),
    currentStatus: varchar("current_status", { length: 50 })
      .notNull()
      .default("Draft"),
    revisionNum: integer("revision_num").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => ({
    leaderIdx: index("proposals_leader_id_idx").on(table.projectLeaderId),
    campusIdx: index("proposals_campus_id_idx").on(table.campusId),
    departmentIdx: index("proposals_department_id_idx").on(table.departmentId),
    statusIdx: index("proposals_status_idx").on(table.currentStatus),
  }),
);
