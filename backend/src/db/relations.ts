import { relations } from "drizzle-orm";
import { roles } from "./schema/roles.js";
import { campuses } from "./schema/campuses.js";
import { departments } from "./schema/departments.js";
import { users } from "./schema/users.js";
import { proposals } from "./schema/proposals.js";
import { proposalDepartments } from "./schema/proposal-departments.js";
import { proposalMembers } from "./schema/proposal-members.js";
import { specialOrders } from "./schema/special-orders.js";
import { proposalDocuments } from "./schema/proposal-documents.js";
import { proposalComments } from "./schema/proposal-comments.js";
import { proposalReviews } from "./schema/proposal-reviews.js";
import { beneficiarySectors } from "./schema/beneficiary-sectors.js";
import { proposalBeneficiaries } from "./schema/proposal-beneficiaries.js";
import { sdgs } from "./schema/sdgs.js";
import { proposalSdgs } from "./schema/proposal-sdgs.js";
import { moas } from "./schema/moas.js";
import { projects } from "./schema/projects.js";
import { progressReports } from "./schema/progress-reports.js";
import { auditLogs } from "./schema/audit-logs.js";

// ── Roles ──
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

// ── Campuses ──
export const campusesRelations = relations(campuses, ({ many }) => ({
  users: many(users),
  proposals: many(proposals),
}));

// ── Departments ──
export const departmentsRelations = relations(
  departments,
  ({ many }) => ({
    users: many(users),
    proposalDepartments: many(proposalDepartments),
    ledProposals: many(proposals),
  }),
);

// ── Users ──
export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.roleId] }),
  campus: one(campuses, {
    fields: [users.campusId],
    references: [campuses.campusId],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.departmentId],
  }),
  ledProposals: many(proposals),
  proposalMemberships: many(proposalMembers),
  proposalComments: many(proposalComments),
  proposalReviews: many(proposalReviews),
  progressReports: many(progressReports),
  auditLogs: many(auditLogs),
}));

// ── Proposals ──
export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  projectLeader: one(users, {
    fields: [proposals.projectLeaderId],
    references: [users.userId],
  }),
  campus: one(campuses, {
    fields: [proposals.campusId],
    references: [campuses.campusId],
  }),
  department: one(departments, {
    fields: [proposals.departmentId],
    references: [departments.departmentId],
  }),
  proposalDepartments: many(proposalDepartments),
  members: many(proposalMembers),
  documents: many(proposalDocuments),
  comments: many(proposalComments),
  reviews: many(proposalReviews),
  beneficiaries: many(proposalBeneficiaries),
  sdgs: many(proposalSdgs),
  project: one(projects, {
    fields: [proposals.proposalId],
    references: [projects.proposalId],
  }),
}));

// ── Proposal Departments (Junction) ──
export const proposalDepartmentsRelations = relations(
  proposalDepartments,
  ({ one }) => ({
    proposal: one(proposals, {
      fields: [proposalDepartments.proposalId],
      references: [proposals.proposalId],
    }),
    department: one(departments, {
      fields: [proposalDepartments.departmentId],
      references: [departments.departmentId],
    }),
  }),
);

// ── Proposal Members ──
export const proposalMembersRelations = relations(
  proposalMembers,
  ({ one, many }) => ({
    proposal: one(proposals, {
      fields: [proposalMembers.proposalId],
      references: [proposals.proposalId],
    }),
    user: one(users, {
      fields: [proposalMembers.userId],
      references: [users.userId],
    }),
    specialOrders: many(specialOrders),
  }),
);

// ── Special Orders ──
export const specialOrdersRelations = relations(specialOrders, ({ one }) => ({
  member: one(proposalMembers, {
    fields: [specialOrders.memberId],
    references: [proposalMembers.memberId],
  }),
}));

// ── Proposal Documents ──
export const proposalDocumentsRelations = relations(
  proposalDocuments,
  ({ one, many }) => ({
    proposal: one(proposals, {
      fields: [proposalDocuments.proposalId],
      references: [proposals.proposalId],
    }),
    comments: many(proposalComments),
  }),
);

// ── Proposal Comments ──
export const proposalCommentsRelations = relations(
  proposalComments,
  ({ one }) => ({
    proposal: one(proposals, {
      fields: [proposalComments.proposalId],
      references: [proposals.proposalId],
    }),
    document: one(proposalDocuments, {
      fields: [proposalComments.documentId],
      references: [proposalDocuments.documentId],
    }),
    user: one(users, {
      fields: [proposalComments.userId],
      references: [users.userId],
    }),
  }),
);

// ── Proposal Reviews ──
export const proposalReviewsRelations = relations(
  proposalReviews,
  ({ one }) => ({
    proposal: one(proposals, {
      fields: [proposalReviews.proposalId],
      references: [proposals.proposalId],
    }),
    reviewer: one(users, {
      fields: [proposalReviews.reviewerId],
      references: [users.userId],
    }),
  }),
);

// ── Beneficiary Sectors ──
export const beneficiarySectorsRelations = relations(
  beneficiarySectors,
  ({ many }) => ({
    proposalBeneficiaries: many(proposalBeneficiaries),
  }),
);

// ── Proposal Beneficiaries (Junction) ──
export const proposalBeneficiariesRelations = relations(
  proposalBeneficiaries,
  ({ one }) => ({
    proposal: one(proposals, {
      fields: [proposalBeneficiaries.proposalId],
      references: [proposals.proposalId],
    }),
    sector: one(beneficiarySectors, {
      fields: [proposalBeneficiaries.sectorId],
      references: [beneficiarySectors.sectorId],
    }),
  }),
);

// ── SDGs ──
export const sdgsRelations = relations(sdgs, ({ many }) => ({
  proposalSdgs: many(proposalSdgs),
}));

// ── Proposal SDGs (Junction) ──
export const proposalSdgsRelations = relations(proposalSdgs, ({ one }) => ({
  proposal: one(proposals, {
    fields: [proposalSdgs.proposalId],
    references: [proposals.proposalId],
  }),
  sdg: one(sdgs, {
    fields: [proposalSdgs.sdgId],
    references: [sdgs.sdgId],
  }),
}));

// ── MOAs ──
export const moasRelations = relations(moas, ({ many }) => ({
  projects: many(projects),
}));

// ── Projects ──
export const projectsRelations = relations(projects, ({ one, many }) => ({
  proposal: one(proposals, {
    fields: [projects.proposalId],
    references: [proposals.proposalId],
  }),
  moa: one(moas, {
    fields: [projects.moaId],
    references: [moas.moaId],
  }),
  progressReports: many(progressReports),
}));

// ── Progress Reports ──
export const progressReportsRelations = relations(
  progressReports,
  ({ one }) => ({
    project: one(projects, {
      fields: [progressReports.projectId],
      references: [projects.projectId],
    }),
    submitter: one(users, {
      fields: [progressReports.submittedBy],
      references: [users.userId],
    }),
  }),
);

// ── Audit Logs ──
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.userId],
  }),
}));
