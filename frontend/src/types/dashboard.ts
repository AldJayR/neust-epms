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
	metrics: DirectorDashboardMetric;
	chartMonths: string[];
	chartData: DirectorChartPoint[];
	recentActivities: DirectorActivity[];
	expiringMoas: DirectorMoa[];
}
