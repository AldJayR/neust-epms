import { and, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { PROJECT_STATUS, PROPOSAL_STATUS } from "@/lib/types.js";

export const ACTIVE_EXTENSION_PROJECT_STATUSES = [
	PROJECT_STATUS.ONGOING,
	PROJECT_STATUS.OVERDUE,
	PROJECT_STATUS.PENDING_CLOSURE,
] as const;

export function getActiveProjectConditions(): SQL[] {
	return [
		isNull(projects.archivedAt),
		isNull(proposals.archivedAt),
		inArray(projects.projectStatus, ACTIVE_EXTENSION_PROJECT_STATUSES),
		isNull(proposalMembers.archivedAt),
	];
}

/** Shared counts; callers can restrict the contributing projects to their scope. */
export function getActiveInvolvementSubquery(projectScope?: SQL) {
	const activeProject = and(isNull(projects.archivedAt), inArray(projects.projectStatus, ACTIVE_EXTENSION_PROJECT_STATUSES));
	const pendingProposal = and(
		isNull(projects.archivedAt),
		or(isNull(projects.projectId), eq(projects.projectStatus, PROJECT_STATUS.APPROVED)),
		inArray(proposals.status, [PROPOSAL_STATUS.PENDING_REVIEW, PROPOSAL_STATUS.ENDORSED, PROPOSAL_STATUS.RETURNED, PROPOSAL_STATUS.APPROVED, PROPOSAL_STATUS.INSTITUTIONALLY_APPROVED]),
	);
	return db
		.select({
			userId: proposalMembers.userId,
			leadProjects:
				sql<number>`count(*) filter (where ${activeProject} AND ${proposalMembers.projectRole} = 'Project Leader')`.as(
					"lead_projects",
				),
			collaboratorProjects:
				sql<number>`count(*) filter (where ${activeProject} AND ${proposalMembers.projectRole} != 'Project Leader')`.as(
					"collaborator_projects",
				),
			totalInvolvement: sql<number>`count(*) filter (where ${activeProject})`.as("total_involvement"),
			leadProposals: sql<number>`count(*) filter (where ${pendingProposal} AND ${proposalMembers.projectRole} = 'Project Leader')`.as("lead_proposals"),
			totalWorkload: sql<number>`count(*)`.as("total_workload"),
		})
		.from(proposalMembers)
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.leftJoin(projects, eq(proposals.proposalId, projects.proposalId))
		.where(and(isNull(proposals.archivedAt), isNull(proposalMembers.archivedAt), or(activeProject, pendingProposal), projectScope))
		.groupBy(proposalMembers.userId)
		.as("active_faculty_involvement");
}
