import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";

/**
 * Reusable subquery that selects Project Leader members.
 * Used across projects, proposals, action-center, and director modules.
 */
export function getLeaderSubquery() {
	return db
		.select({
			proposalId: proposalMembers.proposalId,
			userId: proposalMembers.userId,
		})
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.projectRole, "Project Leader"),
				isNull(proposalMembers.archivedAt),
			),
		)
		.as("leader_members");
}
