export interface StatusDescription {
	label: string;
	explanation: string;
	nextStep: string;
}

export const PROPOSAL_STATUS_DESCRIPTIONS: Record<string, StatusDescription> = {
	Draft: {
		label: "Draft",
		explanation: "Your proposal is saved but not yet submitted for review.",
		nextStep: "Edit and submit when ready.",
	},
	"Pending Review": {
		label: "Awaiting Review",
		explanation:
			"Your proposal has been submitted and is awaiting RET Chair review.",
		nextStep:
			"No action required — you will be notified when a decision is made.",
	},
	Endorsed: {
		label: "Endorsed — Awaiting Approval",
		explanation:
			"The RET Chair has endorsed your proposal. The Director reviews it next.",
		nextStep: "Awaiting the Director/Admin approval decision.",
	},
	Approved: {
		label: "Director Approved — Approval Document Pending",
		explanation:
			"The Director has approved your proposal. The signed institutional approval document still needs to be uploaded.",
		nextStep: "The Director uploads the signed institutional approval document next.",
	},
	"Institutionally Approved": {
		label: "Institutionally Approved — Awaiting Activation",
		explanation:
			"Institutional approval has been recorded. The Director must activate the project before work begins.",
		nextStep: "Director/Admin completes the requirements before the project can start.",
	},
	Returned: {
		label: "Revision Required",
		explanation:
			"Your proposal has been returned for revision. Review the feedback carefully, make the requested changes, and resubmit.",
		nextStep: "Review feedback and submit a revised proposal.",
	},
	Rejected: {
		label: "Not Approved",
		explanation:
			"Your proposal was not approved. Please review the feedback for details.",
		nextStep: "No further action on this proposal.",
	},
};

export const PROJECT_STATUS_DESCRIPTIONS: Record<string, StatusDescription> = {
	Approved: {
		label: "Approved — Awaiting Activation",
		explanation:
			"Your proposal is approved, but work cannot begin yet. Required: valid MOA, report due dates, and Special Orders.",
		nextStep: "Awaiting Director/Admin activation.",
	},
	Ongoing: {
		label: "Active Project",
		explanation: "Your project is approved and actively implementing.",
		nextStep: "Submit reports on time per your schedule.",
	},
	Overdue: {
		label: "Reports Overdue",
		explanation:
			"One or more required reports have not been submitted by their deadline.",
		nextStep: "Submit overdue report(s) immediately.",
	},
	Expired: {
		label: "MOA Expired",
		explanation:
			"The Memorandum of Agreement covering this project has expired. The project cannot continue until a valid MOA is renewed.",
		nextStep: "Contact the Extension Services office.",
	},
	"Pending Closure": {
		label: "Pending Closure",
		explanation:
			"Final reports have been submitted. The project is awaiting final review and closure.",
		nextStep: "Awaiting the Director/Admin closure decision.",
	},
	Completed: {
		label: "Completed",
		explanation: "All reports submitted and project activities finished.",
		nextStep: "No further action required.",
	},
	Closed: {
		label: "Closed",
		explanation:
			"The Director has approved project closure.",
		nextStep: "No further action required.",
	},
};

export function getProposalStatusDescription(
	status: string,
): StatusDescription {
	return (
		PROPOSAL_STATUS_DESCRIPTIONS[status] ?? {
			label: status,
			explanation: `Status: ${status}`,
			nextStep: "N/A",
		}
	);
}

export function getProjectStatusDescription(status: string): StatusDescription {
	return (
		PROJECT_STATUS_DESCRIPTIONS[status] ?? {
			label: status,
			explanation: `Status: ${status}`,
			nextStep: "N/A",
		}
	);
}
