import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/projects.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { PROJECT_STATUS } from "@/lib/types.js";

export const ACTIVE_EXTENSION_PROJECT_STATUSES = [
	PROJECT_STATUS.APPROVED,
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
	return db
		.select({
			userId: proposalMembers.userId,
			leadProjects:
				sql<number>`count(*) filter (where ${proposalMembers.projectRole} = 'Project Leader')`.as(
					"lead_projects",
				),
			collaboratorProjects:
				sql<number>`count(*) filter (where ${proposalMembers.projectRole} != 'Project Leader')`.as(
					"collaborator_projects",
				),
			totalInvolvement: sql<number>`count(*)`.as("total_involvement"),
		})
		.from(proposalMembers)
		.innerJoin(proposals, eq(proposalMembers.proposalId, proposals.proposalId))
		.innerJoin(projects, eq(proposals.proposalId, projects.proposalId))
		.where(and(...getActiveProjectConditions(), projectScope))
		.groupBy(proposalMembers.userId)
		.as("active_faculty_involvement");
}
