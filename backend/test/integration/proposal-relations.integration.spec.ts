import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { beneficiarySectors } from "@/db/schema/beneficiary-sectors.js";
import { extensionServices } from "@/db/schema/extension-services.js";
import { proposalBeneficiaries } from "@/db/schema/proposal-beneficiaries.js";
import { proposalDepartments } from "@/db/schema/proposal-departments.js";
import { proposalExtensionServices } from "@/db/schema/proposal-extension-services.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalSdgs } from "@/db/schema/proposal-sdgs.js";
import { proposals } from "@/db/schema/proposals.js";
import { sdgs } from "@/db/schema/sdgs.js";
import { createProposalInTransaction } from "@/modules/proposals/proposals.service.js";
import { ROLE_NAMES, PROPOSAL_STATUS } from "@/lib/types.js";
import { seedAuthUser, seedOrganization } from "./fixtures.js";

describe("proposal relation transactions", () => {
	it("creates the proposal and all selected relational links atomically", async () => {
		const organization = await seedOrganization("relations-create");
		const faculty = await seedAuthUser(organization, {
			slug: "relations-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const services = await db
			.select({ extensionServiceId: extensionServices.extensionServiceId })
			.from(extensionServices)
			.orderBy(extensionServices.extensionServiceId)
			.limit(2);
		const [sector] = await db
			.insert(beneficiarySectors)
			.values({ sectorName: "Relations Sector" })
			.returning();
		const [sdg] = await db
			.insert(sdgs)
			.values({ sdgNumber: 9, sdgTitle: "Industry, Innovation and Infrastructure" })
			.returning();

		const proposal = await db.transaction((tx) =>
			createProposalInTransaction(
				tx,
				{
					campusId: organization.mainCampus.campusId,
					departmentId: organization.departmentA.departmentId,
					title: "Atomic Relations Proposal",
					bannerProgram: "Integration",
					projectLocale: "Cabanatuan City",
					extensionServiceIds: services.map((service) => service.extensionServiceId),
					departmentIds: [organization.departmentB.departmentId],
					sectorIds: [sector.sectorId],
					sdgIds: [sdg.sdgId],
				},
				faculty,
			),
		);

		const [member] = await db
			.select({ projectRole: proposalMembers.projectRole })
			.from(proposalMembers)
			.where(eq(proposalMembers.proposalId, proposal.proposalId));
		const departments = await db
			.select({ departmentId: proposalDepartments.departmentId })
			.from(proposalDepartments)
			.where(eq(proposalDepartments.proposalId, proposal.proposalId));
		const beneficiaryLinks = await db
			.select()
			.from(proposalBeneficiaries)
			.where(eq(proposalBeneficiaries.proposalId, proposal.proposalId));
		const serviceLinks = await db
			.select({ extensionServiceId: proposalExtensionServices.extensionServiceId })
			.from(proposalExtensionServices)
			.where(eq(proposalExtensionServices.proposalId, proposal.proposalId));
		const sdgLinks = await db
			.select()
			.from(proposalSdgs)
			.where(eq(proposalSdgs.proposalId, proposal.proposalId));

		expect(proposal.status).toBe(PROPOSAL_STATUS.DRAFT);
		expect(member?.projectRole).toBe("Project Leader");
		expect(departments).toHaveLength(1);
		expect(beneficiaryLinks).toHaveLength(1);
		expect(serviceLinks.map((link) => link.extensionServiceId)).toEqual(
			services.map((service) => service.extensionServiceId),
		);
		expect(sdgLinks).toHaveLength(1);
	});

	it("rolls back the proposal when an extension service ID is invalid", async () => {
		const organization = await seedOrganization("relations-rollback");
		const faculty = await seedAuthUser(organization, {
			slug: "rollback-leader",
			roleName: ROLE_NAMES.FACULTY,
		});

		await expect(
			db.transaction((tx) =>
				createProposalInTransaction(
					tx,
					{
						campusId: organization.mainCampus.campusId,
						departmentId: organization.departmentA.departmentId,
						title: "Rollback Relations Proposal",
						bannerProgram: "Integration",
						projectLocale: "Cabanatuan City",
						extensionServiceIds: [999999],
					},
					faculty,
				),
			),
		).rejects.toMatchObject({ code: "INVALID_EXTENSION_SERVICES" });

		const rows = await db
			.select({ proposalId: proposals.proposalId })
			.from(proposals)
			.where(inArray(proposals.title, ["Rollback Relations Proposal"]));
		expect(rows).toHaveLength(0);
	});
});
