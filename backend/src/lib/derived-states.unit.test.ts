import { describe, expect, it } from "vitest";
import { deriveProjectState, deriveProposalState } from "./derived-states.js";
import { PROJECT_STATUS, PROPOSAL_STATUS, type AuthUser } from "./types.js";

const user: AuthUser = {
	userId: "user-1",
	email: "user@neust.edu.ph",
	roleId: 4,
	roleName: "Faculty",
	campusId: 1,
	campusName: "Main",
	isMainCampus: true,
	departmentId: 1,
	departmentName: "Department",
	firstName: "Test",
	middleName: null,
	lastName: "User",
	nameSuffix: null,
	academicRank: null,
	avatarUrl: null,
	isActive: true,
	hasCompletedOnboarding: true,
};

describe("deriveProposalState", () => {
	it("makes a bypassed pending proposal actionable for the Director", () => {
		const result = deriveProposalState(
			{
				status: PROPOSAL_STATUS.PENDING_REVIEW,
				bypassedRetChair: true,
			},
			user,
			{ isDirector: true },
		);

		expect(result).toMatchObject({ state: "ACT", owner: "You" });
	});

	it("falls back safely for a rejected proposal", () => {
		const result = deriveProposalState(
			{ status: PROPOSAL_STATUS.REJECTED, bypassedRetChair: false },
			user,
		);

		expect(result).toMatchObject({ state: "WATCH", nextTransition: "No further action" });
	});
});

describe("deriveProjectState", () => {
	it("reports every activation blocker", () => {
		const result = deriveProjectState(
			{ projectStatus: PROJECT_STATUS.APPROVED, moaId: null, reportingSchedule: false },
			user,
		);

		expect(result).toMatchObject({ state: "WAIT", owner: "Director/Admin" });
		expect(result.reason).toContain("Valid MOA not assigned");
		expect(result.reason).toContain("Reporting schedule not established");
	});

	it("assigns pending closure action to the project leader only", () => {
		const result = deriveProjectState(
			{
				projectStatus: PROJECT_STATUS.PENDING_CLOSURE,
				leaderId: user.userId,
			},
			user,
		);

		expect(result).toMatchObject({ state: "ACT", owner: "You" });
	});
});
