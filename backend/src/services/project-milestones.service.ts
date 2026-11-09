import type { db } from "@/db/client.js";
import { projectMilestones } from "@/db/schema/project-milestones.js";
import type { ProjectMilestoneKind } from "@/lib/milestone-types.js";
import { REVIEW_DECISION, REVIEW_STAGE } from "@/lib/types.js";

/** The caller supplies its transaction so a failed workflow cannot create an update. */
export async function recordProjectMilestone(
	connection: Pick<typeof db, "insert">,
	input: {
		proposalId: string;
		kind: ProjectMilestoneKind;
		actorId: string | null;
		sourceKey: string;
		occurredAt?: Date;
	},
) {
	await connection
		.insert(projectMilestones)
		.values({ ...input, occurredAt: input.occurredAt ?? new Date() })
		.onConflictDoNothing({ target: projectMilestones.sourceKey });
}

export function reviewMilestoneKind(
	stage: string,
	decision: string,
): ProjectMilestoneKind | null {
	if (
		stage === REVIEW_STAGE.ENDORSEMENT &&
		decision === REVIEW_DECISION.ENDORSED
	)
		return "proposal_endorsed";
	if (stage !== REVIEW_STAGE.APPROVAL) return null;
	if (decision === REVIEW_DECISION.APPROVED) return "proposal_approved";
	if (decision === REVIEW_DECISION.RETURNED) return "proposal_returned";
	if (decision === REVIEW_DECISION.REJECTED) return "proposal_rejected";
	return null;
}
