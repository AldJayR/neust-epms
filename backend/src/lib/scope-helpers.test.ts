import { describe, it, expect } from "vitest";
import { buildProposalScope, buildProposalScopeClause } from "./scope-helpers.js";
import { ROLE_NAMES } from "@/lib/types.js";

describe("buildProposalScope", () => {
	it("returns archivedAt condition for Director (full access)", () => {
		const user = { roleName: ROLE_NAMES.DIRECTOR, departmentId: 1, campusId: 1, isMainCampus: true } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(1);
	});

	it("scopes by department for Faculty with departmentId", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: 5, campusId: 1, isMainCampus: false } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by campus for Faculty without departmentId", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: null, campusId: 3, isMainCampus: false } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by department for RET Chair on main campus with departmentId", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: 2, campusId: 1, isMainCampus: true } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by campus for RET Chair not on main campus", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: null, campusId: 4, isMainCampus: false } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});

	it("scopes by campus for RET Chair on main campus but no departmentId", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: null, campusId: 1, isMainCampus: true } as any;
		const conditions = buildProposalScope(user);
		expect(conditions).toHaveLength(2);
	});
});

describe("buildProposalScopeClause", () => {
	it("returns undefined for Director", () => {
		const user = { roleName: ROLE_NAMES.DIRECTOR, departmentId: 1, campusId: 1, isMainCampus: true } as any;
		expect(buildProposalScopeClause(user)).toBeUndefined();
	});

	it("returns department clause for RET Chair on main campus", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: 2, campusId: 1, isMainCampus: true } as any;
		expect(buildProposalScopeClause(user)).toBeDefined();
	});

	it("returns campus clause for RET Chair not on main campus", () => {
		const user = { roleName: ROLE_NAMES.RET_CHAIR, departmentId: null, campusId: 4, isMainCampus: false } as any;
		expect(buildProposalScopeClause(user)).toBeDefined();
	});

	it("returns department clause for Faculty with departmentId", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: 5, campusId: 1, isMainCampus: false } as any;
		expect(buildProposalScopeClause(user)).toBeDefined();
	});

	it("returns campus clause for Faculty without departmentId", () => {
		const user = { roleName: ROLE_NAMES.FACULTY, departmentId: null, campusId: 3, isMainCampus: false } as any;
		expect(buildProposalScopeClause(user)).toBeDefined();
	});
});
