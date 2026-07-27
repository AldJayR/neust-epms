import { describe, expect, it } from "vitest";
import { ROLE_NAMES, type AuthUser } from "./types.js";
import { assertProposalAccess } from "./proposal-access-policy.js";

const user: AuthUser = {
	userId: "user-1",
	email: "user@neust.edu.ph",
	roleId: 4,
	roleName: ROLE_NAMES.FACULTY,
	campusId: 1,
	campusName: "Main",
	isMainCampus: true,
	departmentId: 10,
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

describe("assertProposalAccess", () => {
	it("allows an active proposal in the user's scope", () => {
		expect(() =>
			assertProposalAccess(user, {
				proposalId: "proposal-1",
				campusId: 99,
				departmentId: 10,
				archivedAt: null,
			}),
		).not.toThrow();
	});

	it("rejects archived proposals", () => {
		expect(() =>
			assertProposalAccess(user, {
				proposalId: "proposal-1",
				campusId: 1,
				departmentId: 10,
				archivedAt: new Date("2026-01-01"),
			}),
		).toThrowError("You do not have access to this proposal");
	});

	it("rejects proposals outside the user's scope", () => {
		expect(() =>
			assertProposalAccess(user, {
				proposalId: "proposal-1",
				campusId: 1,
				departmentId: 11,
				archivedAt: null,
			}),
		).toThrowError("You do not have access to this proposal");
	});
});
