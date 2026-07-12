export interface ProjectMemberSpecialOrder {
	specialOrderId: string;
	soNumber: string;
	storagePath: string | null;
	dateIssued: string | null;
	status: string;
}

export interface ProjectMember {
	memberId: string;
	userId: string;
	name: string;
	role: string;
	avatarUrl?: string;
	specialOrder?: ProjectMemberSpecialOrder | null;
}

export interface ProjectHistoryItem {
	id: string;
	type: "document" | "review" | "edit";
	version: string;
	status: string;
	actorName: string;
	date: string;
	comment?: string;
}

export interface HubProject {
	id: string;
	title: string;
	leaderName: string;
	leaderRank: string | null;
	college: string | null;
	dateSubmitted: string;
	lastReportDate?: string | null;
	status: string;
	type: "Proposal" | "Project";
}

export interface ProjectHubResponse {
	items: HubProject[];
	total: number;
}

export interface ProjectHubParams {
	page: number;
	limit: number;
	search?: string;
	college?: string;
	status?: string;
	myProjectsOnly?: string;
}

export interface ProjectAttachment {
	id: string;
	name: string;
	type: string;
	url: string;
	version: string;
}

export interface ProjectDetailsResponse {
	id: string;
	title: string;
	status: string;
	version: string;
	bypassedRetChair: boolean;
	metadata: {
		leader: { name: string; avatarUrl?: string };
		departmentCode: string;
		department: string;
		duration: string;
		moaLinked: string;
		sdgs?: string;
		budget: { total: number; neust: number; partner: number };
	};
	members: ProjectMember[];
	history: ProjectHistoryItem[];
	attachments: ProjectAttachment[];
}
