export interface AuthUser {
	userId: string;
	email: string;
	roleId: number;
	roleName: string;
	campusId: number;
	campusName: string;
	isMainCampus: boolean;
	departmentId: number | null;
	departmentName: string | null;
	firstName: string;
	middleName: string | null;
	lastName: string;
	nameSuffix: string | null;
	academicRank: string | null;
	isActive: boolean;
	hasCompletedOnboarding: boolean;
}

export interface FacultyInvolvement {
	userId: string;
	firstName: string;
	lastName: string;
	academicRank: string | null;
	college: string | null;
	departmentCode: string | null;
	campusName: string | null;
	isMainCampus: boolean | null;
	isActive: boolean;
	leadProjects: number;
	collaboratorProjects: number;
	totalInvolvement: number;
}

export interface FacultyDirectoryResponse {
	items: FacultyInvolvement[];
	total: number;
	metrics: {
		totalActiveExtension: number;
		averageProjectsPerFaculty: number;
		mostActiveCollege: {
			name: string;
			contributors: number;
			contributorAvatars: FacultyContributorAvatar[];
		};
	};
}

export interface FacultyContributorAvatar {
	userId: string;
	name: string;
	avatarUrl: string | null;
}
