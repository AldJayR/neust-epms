export interface DirectorDashboardMetric {
	totalProjects: number;
	ongoingProjects: number;
	underEvaluation: number;
	completed: number;
	overdueProjects?: number;
	pendingClosureProjects?: number;
}

export interface DirectorChartPoint {
	label: string;
	department: string;
	departmentCode: string;
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
	chartData: DirectorChartPoint[];
	recentActivities: DirectorActivity[];
	expiringMoas: DirectorMoa[];
}
