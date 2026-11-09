export const PROJECT_MILESTONE_KINDS = [
	"proposal_endorsed",
	"proposal_approved",
	"proposal_returned",
	"proposal_rejected",
	"signed_documents_completed",
	"project_activated",
	"terminal_package_completed",
	"project_completed",
] as const;

export type ProjectMilestoneKind = (typeof PROJECT_MILESTONE_KINDS)[number];
