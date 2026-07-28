import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { searchEntities } from "@/modules/search/search.service.js";
import { ROLE_NAMES, PROPOSAL_STATUS } from "@/lib/types.js";
import {
	seedAuthUser,
	seedOrganization,
	seedPartnerAndMoa,
	seedProposal,
} from "./fixtures.js";

describe("PostgreSQL full-text search", () => {
	it("applies simple prefix matching and department scope", async () => {
		const organization = await seedOrganization("search-scope");
		const faculty = await seedAuthUser(organization, {
			slug: "search-faculty",
			roleName: ROLE_NAMES.FACULTY,
			department: organization.departmentA,
		});
		const visible = await seedProposal(organization, {
			title: "Xylophonealpha Community Program",
			department: organization.departmentA,
			status: PROPOSAL_STATUS.APPROVED,
		});
		await seedProposal(organization, {
			title: "Xylophonealpha Hidden Program",
			department: organization.departmentB,
			status: PROPOSAL_STATUS.APPROVED,
		});

		const result = await searchEntities(faculty, {
			q: "XYLOPHONEAL",
			type: "proposals",
			limit: 10,
		});

		expect(result.results).toHaveLength(1);
		expect(result.results[0]).toMatchObject({
			type: "proposals",
			id: visible.proposalId,
			title: "Xylophonealpha Community Program",
		});
});

	it("searches MOA partners for Directors and enforces Super Admin restrictions", async () => {
		const organization = await seedOrganization("search-roles");
		const director = await seedAuthUser(organization, {
			slug: "search-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const admin = await seedAuthUser(organization, {
			slug: "search-admin",
			roleName: ROLE_NAMES.SUPER_ADMIN,
			department: null,
		});
		await seedPartnerAndMoa(organization, {
			slug: "Xylophonealpha",
			validUntil: new Date("2099-12-31T00:00:00.000Z"),
		});

		const moaResults = await searchEntities(director, {
			q: "xylophonealpha",
			type: "moas",
			limit: 10,
		});
		expect(moaResults.results).toHaveLength(1);
		expect(moaResults.results[0]?.type).toBe("moas");

		await expect(
			searchEntities(admin, { q: "proposal", type: "proposals", limit: 5 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
});

	it("rejects a query containing no searchable tokens", async () => {
		const organization = await seedOrganization("search-invalid");
		const faculty = await seedAuthUser(organization, {
			slug: "search-invalid-user",
			roleName: ROLE_NAMES.FACULTY,
		});

		await expect(
			searchEntities(faculty, { q: "--- !!!", type: "all", limit: 5 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});
