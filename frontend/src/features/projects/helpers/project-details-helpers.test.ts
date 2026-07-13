import { describe, expect, it } from "vitest";
import {
	canManageSpecialOrders,
	canReadProject,
	canUploadSpecialOrder,
	isProjectLeader,
} from "./project-details-helpers";
import type { ProjectMember } from "@/types/project";

const members: ProjectMember[] = [
	{ memberId: "member-1", userId: "leader", name: "Leader", role: "Project Leader" },
	{ memberId: "member-2", userId: "member", name: "Member", role: "Member" },
];

describe("project details permission helpers", () => {
	it("recognizes project leaders and ordinary members", () => {
		expect(isProjectLeader("leader", members)).toBe(true);
		expect(isProjectLeader("member", members)).toBe(false);
	});

	it("preserves project read and special-order management access", () => {
		expect(canReadProject("other", "Director", members)).toBe(true);
		expect(canReadProject("other", "Faculty", members)).toBe(false);
		expect(canManageSpecialOrders("member", "Faculty", members)).toBe(true);
		expect(canManageSpecialOrders("other", "Faculty", members)).toBe(false);
	});

	it("allows upload only for approved projects and leaders or directors", () => {
		expect(canUploadSpecialOrder("Pending Review", "leader", "Faculty", members)).toBe(false);
		expect(canUploadSpecialOrder("Approved", "leader", "Faculty", members)).toBe(true);
		expect(canUploadSpecialOrder("Approved", "other", "Director", members)).toBe(true);
		expect(canUploadSpecialOrder("Approved", "member", "Faculty", members)).toBe(false);
	});
});
