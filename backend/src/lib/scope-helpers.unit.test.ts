import { describe, expect, it } from "vitest";
import { ROLE_NAMES, type AuthUser } from "./types.js";
import { isProposalInScope } from "./scope-helpers.js";

function user(overrides: Partial<AuthUser> = {}): AuthUser {
	return {
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
		...overrides,
	};
}

describe("isProposalInScope", () => {
	it("scopes main-campus operational users by department", () => {
		const faculty = user();

		expect(isProposalInScope(faculty, { campusId: 99, departmentId: 10 })).toBe(true);
		expect(isProposalInScope(faculty, { campusId: 1, departmentId: 11 })).toBe(false);
	});

	it("scopes satellite-campus users by campus", () => {
		const faculty = user({ isMainCampus: false, departmentId: null, campusId: 2 });

		expect(isProposalInScope(faculty, { campusId: 2, departmentId: 99 })).toBe(true);
		expect(isProposalInScope(faculty, { campusId: 3, departmentId: 99 })).toBe(false);
	});

	it("allows privileged roles to access every proposal", () => {
		expect(
			isProposalInScope(user({ roleName: ROLE_NAMES.DIRECTOR }), {
				campusId: 99,
				departmentId: 99,
			}),
		).toBe(true);
	});
});
