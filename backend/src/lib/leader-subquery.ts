import { eq } from "drizzle-orm";
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
		.where(eq(proposalMembers.projectRole, "Project Leader"))
		.as("leader_members");
}
