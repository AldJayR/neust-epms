import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { ApiError } from "@/lib/errors.js";
import type { AuthUser } from "@/lib/types.js";
import { PROJECT_LEADER_ROLE } from "@/services/auth-user.service.js";
import { TERMINAL_REPORT_TYPES } from "./report-metrics.js";

/** Terminal packages are leader-owned; progress reports retain member access. */
export async function assertReportSubmissionAccess(
	user: AuthUser,
	proposalId: string,
	reportType: string,
	executor: Pick<typeof db, "select"> = db,
) {
	const [membership] = await executor
		.select({ projectRole: proposalMembers.projectRole })
		.from(proposalMembers)
		.where(and(
			eq(proposalMembers.proposalId, proposalId),
			eq(proposalMembers.userId, user.userId),
			isNull(proposalMembers.archivedAt),
		))
		.limit(1);
	if (!membership) {
		throw new ApiError(403, "NOT_MEMBER", "Only project members can submit reports for this project");
	}
	if (
		TERMINAL_REPORT_TYPES.some((type) => type === reportType) &&
		membership.projectRole !== PROJECT_LEADER_ROLE
	) {
		throw new ApiError(403, "NOT_LEADER", "Only the Project Leader can submit the terminal report and closure documents.");
	}
}
