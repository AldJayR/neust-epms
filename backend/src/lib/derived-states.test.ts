import { describe, it, expect } from "vitest";
import { deriveProposalState, deriveProjectState } from "./derived-states.js";
import type { AuthUser } from "./types.js";

// Mock AuthUsers
const mockFacultyUser: AuthUser = {
	userId: "user-faculty-123",
	email: "faculty@neust.edu.ph",
	roleId: 4,
	roleName: "Faculty",
	campusId: 1,
	campusName: "Main",
	isMainCampus: true,
	departmentId: 10,
	departmentName: "CIE",
	firstName: "Maria",
	middleName: null,
	lastName: "Santos",
	nameSuffix: null,
	academicRank: "Instructor I",
	avatarUrl: null,
	isActive: true,
};

const mockRtChairUser: AuthUser = {
	userId: "user-chair-456",
	email: "chair@neust.edu.ph",
	roleId: 3,
	roleName: "RET Chair",
	campusId: 1,
	campusName: "Main",
	isMainCampus: true,
	departmentId: 10,
	departmentName: "CIE",
	firstName: "Roberto",
	middleName: null,
	lastName: "Cruz",
	nameSuffix: null,
	academicRank: "Associate Professor I",
	avatarUrl: null,
	isActive: true,
};

const mockDirectorUser: AuthUser = {
	userId: "user-director-789",
	email: "director@neust.edu.ph",
	roleId: 2,
	roleName: "Director",
	campusId: 1,
	campusName: "Main",
	isMainCampus: true,
	departmentId: null,
	departmentName: null,
	firstName: "Elena",
	middleName: null,
	lastName: "Reyes",
	nameSuffix: null,
	academicRank: "Professor IV",
	avatarUrl: null,
	isActive: true,
};

describe("deriveProposalState", () => {
	it("should return ACT state for the leader when returned", () => {
		const proposal = {
			status: "Returned" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockFacultyUser);
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("You");
		expect(result.reason).toContain("returned for revision");
	});

	it("should return WAIT state for non-leaders when returned", () => {
		const proposal = {
			status: "Returned" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockRtChairUser);
		expect(result.state).toBe("WAIT");
		expect(result.owner).toBe("Project Leader");
	});

	it("should return ACT state for Director when pending review and bypassed", () => {
		const proposal = {
			status: "Pending Review" as const,
			bypassedRetChair: true,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockDirectorUser, { isDirector: true });
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("You");
	});

	it("should return ACT state for RT Chair when pending review and not bypassed", () => {
		const proposal = {
			status: "Pending Review" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockRtChairUser, { isRtChair: true });
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("You");
	});

	it("should return WAIT state for others when pending review", () => {
		const proposal = {
			status: "Pending Review" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockFacultyUser);
		expect(result.state).toBe("WAIT");
		expect(result.owner).toBe("RET Chair");
	});

	it("should return ACT state for Director when endorsed", () => {
		const proposal = {
			status: "Endorsed" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockDirectorUser, { isDirector: true });
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("You");
	});

	it("should return WAIT state for others when endorsed", () => {
		const proposal = {
			status: "Endorsed" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockFacultyUser);
		expect(result.state).toBe("WAIT");
		expect(result.owner).toBe("Director/Admin");
	});

	it("should return ACT state when Draft", () => {
		const proposal = {
			status: "Draft" as const,
			bypassedRetChair: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProposalState(proposal, mockFacultyUser);
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("You");
	});

	it("should return WATCH state when Approved or Rejected", () => {
		const approvedResult = deriveProposalState(
			{ status: "Approved" as const, bypassedRetChair: false },
			mockFacultyUser,
		);
		expect(approvedResult.state).toBe("WATCH");

		const rejectedResult = deriveProposalState(
			{ status: "Rejected" as const, bypassedRetChair: false },
			mockFacultyUser,
		);
		expect(rejectedResult.state).toBe("WATCH");
	});
});

describe("deriveProjectState", () => {
	it("should return ACT state when Overdue", () => {
		const project = {
			projectStatus: "Overdue" as const,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockFacultyUser);
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("Project Leader");
	});

	it("should return ACT state when Expired", () => {
		const project = {
			projectStatus: "Expired" as const,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockFacultyUser);
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("Director/Admin");
	});

	it("should return WAIT state when Approved but missing MOA or schedule", () => {
		const project = {
			projectStatus: "Approved" as const,
			moaId: null,
			reportingSchedule: false,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockFacultyUser);
		expect(result.state).toBe("WAIT");
		expect(result.owner).toBe("Director/Admin");
		expect(result.reason).toContain("Valid MOA not assigned");
		expect(result.reason).toContain("Reporting schedule not established");
	});

	it("should return ACT state when Approved and all prerequisites met", () => {
		const project = {
			projectStatus: "Approved" as const,
			moaId: "moa-id-123",
			reportingSchedule: true,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockFacultyUser);
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("Director/Admin");
	});

	it("should return WATCH state when Ongoing", () => {
		const project = {
			projectStatus: "Ongoing" as const,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockFacultyUser);
		expect(result.state).toBe("WATCH");
	});

	it("should return ACT state for leader when Pending Closure", () => {
		const project = {
			projectStatus: "Pending Closure" as const,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockFacultyUser);
		expect(result.state).toBe("ACT");
		expect(result.owner).toBe("You");
	});

	it("should return WATCH state for non-leaders when Pending Closure", () => {
		const project = {
			projectStatus: "Pending Closure" as const,
			leaderId: "user-faculty-123",
		};
		const result = deriveProjectState(project, mockDirectorUser);
		expect(result.state).toBe("WATCH");
		expect(result.owner).toBe("Director/Admin");
	});
});
