export interface ReportItem {
	reportId: string;
	projectId: string;
	milestoneId: string;
	project: string;
	leader: string;
	academicRank: string | null;
	avatarUrl: string | null;
	department: string | null;
	reportType: string;
	submitted: string;
	storagePath: string | null;
	remarks: string | null;
	archivedAt: string | null;
}

export interface ReportsResponse {
	items: ReportItem[];
	total: number;
}

export interface ReportStatsResponse {
	total: number;
	progress: number;
	terminal: number;
}
