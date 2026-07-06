export interface StatusDescription {
	label: string;
	explanation: string;
	nextStep: string;
}

export const STATUS_DESCRIPTIONS: Record<string, StatusDescription> = {
	Draft: {
		label: "Draft",
		explanation: "Your proposal is saved but not yet submitted for review.",
		nextStep: "Edit and submit when ready.",
	},
	"Pending Review": {
		label: "Awaiting Review",
		explanation: "Your proposal has been submitted and is awaiting review.",
		nextStep: "No action required — you will be notified when a decision is made.",
	},
	Endorsed: {
		label: "Endorsed — Awaiting Approval",
		explanation:
			"Your RET Chair has endorsed your proposal and forwarded it to the Extension Services office for final approval.",
		nextStep: "No action required — waiting for Director/Admin decision.",
	},
	Approved: {
		label: "Approved — Activation Required",
		explanation:
			"Your proposal has been approved! However, the project is not yet authorized for implementation. Additional requirements must be completed before the project can begin.",
		nextStep: "Wait for Director/Admin to complete activation requirements.",
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
	Ongoing: {
		label: "Ongoing",
		explanation: "Your project is ongoing.",
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
		nextStep: "No action required — waiting for Director/Admin review.",
	},
	Completed: {
		label: "Completed",
		explanation: "All reports submitted and project activities finished.",
		nextStep: "No further action required.",
	},
	Closed: {
		label: "Closed",
		explanation:
			"Project has been officially closed. All institutional requirements satisfied.",
		nextStep: "No further action required.",
	},
};

export function getStatusDescription(status: string): StatusDescription {
	return (
		STATUS_DESCRIPTIONS[status] ?? {
			label: status,
			explanation: `Status: ${status}`,
			nextStep: "N/A",
		}
	);
}
