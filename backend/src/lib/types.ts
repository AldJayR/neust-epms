import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { roles } from "../db/schema/roles.js";
import type { campuses } from "../db/schema/campuses.js";
import type { departments } from "../db/schema/departments.js";
import type { users } from "../db/schema/users.js";
import type { proposals } from "../db/schema/proposals.js";
import type { proposalDepartments } from "../db/schema/proposal-departments.js";
import type { proposalMembers } from "../db/schema/proposal-members.js";
import type { specialOrders } from "../db/schema/special-orders.js";
import type { proposalDocuments } from "../db/schema/proposal-documents.js";
import type { proposalComments } from "../db/schema/proposal-comments.js";
import type { proposalReviews } from "../db/schema/proposal-reviews.js";
import type { beneficiarySectors } from "../db/schema/beneficiary-sectors.js";
import type { proposalBeneficiaries } from "../db/schema/proposal-beneficiaries.js";
import type { sdgs } from "../db/schema/sdgs.js";
import type { proposalSdgs } from "../db/schema/proposal-sdgs.js";
import type { moas } from "../db/schema/moas.js";
import type { projects } from "../db/schema/projects.js";
import type { progressReports } from "../db/schema/progress-reports.js";
import type { auditLogs } from "../db/schema/audit-logs.js";
import type { systemSettings } from "../db/schema/system-settings.js";

// ── Select (read) types ──
export type Role = InferSelectModel<typeof roles>;
export type Campus = InferSelectModel<typeof campuses>;
export type Department = InferSelectModel<typeof departments>;
export type User = InferSelectModel<typeof users>;
export type Proposal = InferSelectModel<typeof proposals>;
export type ProposalDepartment = InferSelectModel<typeof proposalDepartments>;
export type ProposalMember = InferSelectModel<typeof proposalMembers>;
export type SpecialOrder = InferSelectModel<typeof specialOrders>;
export type ProposalDocument = InferSelectModel<typeof proposalDocuments>;
export type ProposalComment = InferSelectModel<typeof proposalComments>;
export type ProposalReview = InferSelectModel<typeof proposalReviews>;
export type BeneficiarySector = InferSelectModel<typeof beneficiarySectors>;
export type ProposalBeneficiary = InferSelectModel<typeof proposalBeneficiaries>;
export type Sdg = InferSelectModel<typeof sdgs>;
export type ProposalSdg = InferSelectModel<typeof proposalSdgs>;
export type Moa = InferSelectModel<typeof moas>;
export type Project = InferSelectModel<typeof projects>;
export type ProgressReport = InferSelectModel<typeof progressReports>;
export type AuditLog = InferSelectModel<typeof auditLogs>;
export type SystemSetting = InferSelectModel<typeof systemSettings>;

// ── Insert (write) types ──
export type NewRole = InferInsertModel<typeof roles>;
export type NewCampus = InferInsertModel<typeof campuses>;
export type NewDepartment = InferInsertModel<typeof departments>;
export type NewUser = InferInsertModel<typeof users>;
export type NewProposal = InferInsertModel<typeof proposals>;
export type NewProposalDepartment = InferInsertModel<typeof proposalDepartments>;
export type NewProposalMember = InferInsertModel<typeof proposalMembers>;
export type NewSpecialOrder = InferInsertModel<typeof specialOrders>;
export type NewProposalDocument = InferInsertModel<typeof proposalDocuments>;
export type NewProposalComment = InferInsertModel<typeof proposalComments>;
export type NewProposalReview = InferInsertModel<typeof proposalReviews>;
export type NewBeneficiarySector = InferInsertModel<typeof beneficiarySectors>;
export type NewProposalBeneficiary = InferInsertModel<typeof proposalBeneficiaries>;
export type NewSdg = InferInsertModel<typeof sdgs>;
export type NewProposalSdg = InferInsertModel<typeof proposalSdgs>;
export type NewMoa = InferInsertModel<typeof moas>;
export type NewProject = InferInsertModel<typeof projects>;
export type NewProgressReport = InferInsertModel<typeof progressReports>;
export type NewAuditLog = InferInsertModel<typeof auditLogs>;
export type NewSystemSetting = InferInsertModel<typeof systemSettings>;

// ── RBAC role names ──
export const ROLE_NAMES = {
  SUPER_ADMIN: "Super Admin",
  DIRECTOR: "Director",
  RET_CHAIR: "RET Chair",
  FACULTY: "Faculty",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

// ── Proposal status values ──
export const PROPOSAL_STATUS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ENDORSED: "Endorsed",
  APPROVED: "Approved",
  RETURNED: "Returned",
  REJECTED: "Rejected",
} as const;

export type ProposalStatus =
  (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

// ── Review stage values ──
export const REVIEW_STAGE = {
  ENDORSEMENT: "Endorsement",
  APPROVAL: "Approval",
} as const;

export type ReviewStage =
  (typeof REVIEW_STAGE)[keyof typeof REVIEW_STAGE];

// ── Review decision values ──
export const REVIEW_DECISION = {
  ENDORSED: "Endorsed",
  APPROVED: "Approved",
  RETURNED: "Returned",
  REJECTED: "Rejected",
} as const;

export type ReviewDecision =
  (typeof REVIEW_DECISION)[keyof typeof REVIEW_DECISION];

// ── Project status values ──
export const PROJECT_STATUS = {
  APPROVED: "Approved",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

// ── Auth context: attached to every authenticated request ──
export interface AuthUser {
  userId: string;
  email: string;
  roleId: number;
  roleName: string;
  campusId: number;
  campusName?: string;
  departmentId: number | null;
  departmentName?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  nameSuffix?: string | null;
  academicRank?: string | null;
  isActive: boolean;
}
