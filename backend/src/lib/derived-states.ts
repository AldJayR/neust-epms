import type { AuthUser } from "./types.js";
import {
	PROJECT_STATUS,
	PROPOSAL_STATUS,
	type ProjectStatus,
	type ProposalStatus,
	ROLE_NAMES,
} from "./types.js";

export interface DerivedState {
	state: "ACT" | "WAIT" | "WATCH";
	owner: string;
	reason: string;
	nextTransition: string;
}

/**
 * Derives the user-facing action state for a proposal.
 * The same proposal may have different derived states for different users.
 */
export function deriveProposalState(
	proposal: {
		status: ProposalStatus;
		bypassedRetChair: boolean;
		leaderId?: string | null | undefined;
		campusId?: number;
		departmentId?: number | null | undefined;
	},
	user: AuthUser,
	options?: {
		isRtChair?: boolean;
		isDirector?: boolean;
		hasReviewed?: boolean;
	},
): DerivedState {
	const { status } = proposal;

	if (status === PROPOSAL_STATUS.RETURNED) {
		if (user.userId === proposal.leaderId) {
			return {
				state: "ACT",
				owner: "You",
				reason:
					"Your proposal was returned for revision. Review the feedback and resubmit.",
				nextTransition: "Submit revised proposal",
			};
		}
		return {
			state: "WAIT",
			owner: "Project Leader",
			reason:
				"Proposal returned — waiting for faculty member to revise and resubmit.",
			nextTransition: "Resubmitted proposal",
		};
	}

	if (status === PROPOSAL_STATUS.PENDING_REVIEW) {
		if (proposal.bypassedRetChair && options?.isDirector) {
			return {
				state: "ACT",
				owner: "You",
				reason:
					"This proposal previously cleared RET Chair review and has been resubmitted directly to your office.",
				nextTransition: "Approve, return, or reject",
			};
		}
		if (options?.isRtChair && !proposal.bypassedRetChair) {
			return {
				state: "ACT",
				owner: "You",
				reason: "New proposal awaiting college endorsement.",
				nextTransition: "Endorse, return, or reject",
			};
		}
		return {
			state: "WAIT",
			owner: proposal.bypassedRetChair ? "Director/Admin" : "RET Chair",
			reason: `Proposal pending ${proposal.bypassedRetChair ? "Director/Admin" : "RET Chair"} review.`,
			nextTransition: "Review decision",
		};
	}

	if (status === PROPOSAL_STATUS.ENDORSED) {
		if (options?.isDirector) {
			return {
				state: "ACT",
				owner: "You",
				reason:
					"RET Chair endorsed this proposal. Final approval decision needed.",
				nextTransition: "Approve or return",
			};
		}
		return {
			state: "WAIT",
			owner: "Director/Admin",
			reason:
				"Proposal endorsed by RET Chair — awaiting Director/Admin approval.",
			nextTransition: "Approval decision",
		};
	}

	if (status === PROPOSAL_STATUS.DRAFT) {
		return {
			state: "ACT",
			owner: "You",
			reason: "Draft proposal — ready for editing and submission.",
			nextTransition: "Submit for review",
		};
	}

	if (status === PROPOSAL_STATUS.APPROVED) {
		return {
			state: "WATCH",
			owner: "System",
			reason: "Proposal approved — a project will be created automatically.",
			nextTransition: "Project activation",
		};
	}

	if (status === PROPOSAL_STATUS.REJECTED) {
		return {
			state: "WATCH",
			owner: "System",
			reason: "Proposal rejected — project cannot proceed.",
			nextTransition: "No further action",
		};
	}

	return {
		state: "WATCH",
		owner: "System",
		reason: `Status: ${status}`,
		nextTransition: "No further action",
	};
}

/**
 * Derives the user-facing action state for a project.
 */
export function deriveProjectState(
	project: {
		projectStatus: ProjectStatus;
		moaId?: string | null | undefined;
		hasReports?: boolean | undefined;
		reportingSchedule?: boolean | undefined;
		leaderId?: string | null | undefined;
	},
	user: AuthUser,
): DerivedState {
	const { projectStatus } = project;

	if (projectStatus === PROJECT_STATUS.OVERDUE) {
		return {
			state: "ACT",
			owner: "Project Leader",
			reason: "One or more reports are overdue. Immediate attention required.",
			nextTransition: "Submit overdue report(s)",
		};
	}

	if (projectStatus === PROJECT_STATUS.EXPIRED) {
		return {
			state: "ACT",
			owner: "Director/Admin",
			reason:
				"MOA has expired. Project cannot continue until a valid MOA is assigned.",
			nextTransition: "Renew or reassign MOA",
		};
	}

	if (projectStatus === PROJECT_STATUS.APPROVED) {
		const blockers: string[] = [];
		if (!project.moaId) blockers.push("Valid MOA not assigned");
		if (!project.reportingSchedule)
			blockers.push("Reporting schedule not established");

		if (blockers.length > 0) {
			return {
				state: "WAIT",
				owner: "Director/Admin",
				reason: `Project approved but not yet activated. ${blockers.join("; ")}.`,
				nextTransition: "Activate project (Director/Admin)",
			};
		}
		return {
			state: "ACT",
			owner: "Director/Admin",
			reason: "All prerequisites complete. Ready for activation.",
			nextTransition: "Activate project",
		};
	}

	if (projectStatus === PROJECT_STATUS.ONGOING) {
		return {
			state: "WATCH",
			owner: "Director/Admin",
			reason: "Project is active and ongoing.",
			nextTransition: "Submit reports as scheduled",
		};
	}

	if (projectStatus === PROJECT_STATUS.PENDING_CLOSURE) {
		if (user.userId === project.leaderId) {
			return {
				state: "ACT",
				owner: "You",
				reason:
					"Final reports submitted — awaiting Director/Admin review and closure.",
				nextTransition: "Closure confirmation",
			};
		}
		return {
			state: "WATCH",
			owner: "Director/Admin",
			reason: "Pending closure — awaiting Director/Admin review.",
			nextTransition: "Close project",
		};
	}

	if (projectStatus === PROJECT_STATUS.COMPLETED) {
		return {
			state: "WATCH",
			owner: "System",
			reason: "Project completed.",
			nextTransition: "No further action",
		};
	}

	if (projectStatus === PROJECT_STATUS.CLOSED) {
		return {
			state: "WATCH",
			owner: "System",
			reason: "Project closed. No further action required.",
			nextTransition: "No further action",
		};
	}

	return {
		state: "WATCH",
		owner: "System",
		reason: `Status: ${projectStatus}`,
		nextTransition: "No further action",
	};
}
