export interface ProposalItem {
	proposalId: string;
	campusId: number;
	departmentId: number | null;
	title: string;
	bannerProgram: string;
	projectLocale: string;
	extensionServices: ProposalExtensionService[];
	budgetPartner: string | null;
	budgetNeust: string | null;
	status: string;
	bypassedRetChair: boolean;
	revisionNum: number;
	targetStartDate?: string | null;
	targetEndDate?: string | null;
	createdAt: string;
	updatedAt: string;
	archivedAt: string | null;
	leaderFirstName?: string | null;
	leaderLastName?: string | null;
	leaderAcademicRank?: string | null;
}

export interface ProposalFull {
	proposalId: string;
	campusId: number;
	departmentId: number | null;
	title: string;
	bannerProgram: string;
	projectLocale: string;
	extensionServices: ProposalExtensionService[];
	budgetPartner: string | null;
	budgetNeust: string | null;
	status: string;
	targetStartDate: string | null;
	targetEndDate: string | null;
}

export interface ProposalExtensionService {
	extensionServiceId: number;
	serviceName: string;
}
