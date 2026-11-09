export interface DirectorDashboardMetric {
	totalProjects: number;
	ongoingProjects: number;
	underEvaluation: number;
	completed: number;
	overdueProjects?: number;
	pendingClosureProjects?: number;
}

export interface DirectorChartPoint {
	month: string;
	campusId: number;
	campusName: string;
	value: number;
}

export interface DirectorActivity {
	title: string;
	description: string;
	time: string;
}

export interface DirectorMoa {
	name: string;
	dueText: string;
}

export interface DirectorDashboardResponse {
	availableYears: number[];
	metrics: DirectorDashboardMetric;
	chartMonths: string[];
	chartData: DirectorChartPoint[];
	recentActivities: DirectorActivity[];
	expiringMoas: DirectorMoa[];
}

export interface DirectorOverviewFilters {
	year: number;
	campusId?: number;
	departmentId?: number;
}

export interface DirectorProjectCounts {
	totalProjects: number;
	activeProjects: number;
	ongoingProjects: number;
	overdueProjects: number;
	pendingCompletionProjects: number;
	completedProjects: number;
}

export interface DirectorFacultyCounts {
	faculty: number;
	leaders: number;
	collaborators: number;
}

export interface DirectorOverviewResponse {
	metrics: DirectorProjectCounts & { submittedProposals: number };
	units: (DirectorProjectCounts &
		DirectorFacultyCounts & {
			key: string;
			campusId: number;
			campusName: string;
			isMainCampus: boolean;
			departmentId: number | null;
			name: string;
			code: string;
		})[];
	departmentOptions: { id: number; name: string }[];
	proposalStages: { status: string; count: number }[];
	faculty: DirectorFacultyCounts;
	chartMonths: string[];
	chartData: DirectorChartPoint[];
}

export type DirectorWorkQueue =
	| "review"
	| "signing"
	| "activation"
	| "completion"
	| "reports";

export interface DirectorWorkItem {
	id: string;
	proposalId: string;
	projectId: string | null;
	title: string;
	unitLabel: string;
	leader: string;
	status: string;
	since: string | null;
	dueAt: string | null;
	overdue: boolean;
	missingRequirements: string[];
}

export interface DirectorWorkQueueResponse {
	overdueReports: number;
	counts: Record<DirectorWorkQueue, number>;
	total: number;
	page: number;
	limit: number;
	items: DirectorWorkItem[];
}

export type DirectorMilestoneKind =
	| "proposal_endorsed"
	| "proposal_approved"
	| "proposal_returned"
	| "proposal_rejected"
	| "signed_documents_completed"
	| "project_activated"
	| "terminal_package_completed"
	| "project_completed";

export interface DirectorMilestone {
	id: string;
	kind: DirectorMilestoneKind;
	proposalId: string;
	projectId: string | null;
	title: string;
	unitLabel: string;
	campus: string;
	actorId: string | null;
	actorName: string | null;
	occurredAt: string;
}

export interface DirectorMilestonesResponse {
	items: DirectorMilestone[];
	total: number;
	page: number;
	limit: number;
}
