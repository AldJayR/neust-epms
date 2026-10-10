import { count, eq } from "drizzle-orm";
import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { projects } from "@/db/schema/projects.js";
import { bannerPrograms } from "@/db/schema/banner-programs.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import { proposals } from "@/db/schema/proposals.js";
import { processReview } from "@/modules/proposals/proposals.service.js";
import { listRevisionRequests, saveRevisionResponse, verifyRevisionResponse } from "@/modules/proposals/revisions.service.js";
import { getHubProjects } from "@/modules/director/director.service.js";
import submitRoutes from "@/modules/proposals/submit.routes.js";
import { installApiErrorHandler } from "@/lib/errors.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { ROLE_NAMES, PROPOSAL_STATUS } from "@/lib/types.js";
import {
	seedAuthUser,
	seedOrganization,
	seedProposal,
	seedProposalMember,
	seedProject,
	seedProposalRelations,
} from "./fixtures.js";

describe("proposal review lifecycle", () => {
	it("requires fresh Chair endorsement after a Director return and leader resubmission", async () => {
		const organization = await seedOrganization("reendorsement");
		const leader = await seedAuthUser(organization, {
			slug: "revision-leader", roleName: ROLE_NAMES.FACULTY,
		});
		const chair = await seedAuthUser(organization, {
			slug: "revision-chair", roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "revision-director", roleName: ROLE_NAMES.DIRECTOR, department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Revised Proposal",
			targetStartDate: new Date("2099-01-01T00:00:00Z"),
			targetEndDate: new Date("2099-12-31T00:00:00Z"),
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
		await seedProposalRelations(proposal.proposalId);
		const [bannerProgram] = await db.insert(bannerPrograms).values({
			campusId: organization.mainCampus.campusId,
			departmentId: organization.departmentA.departmentId,
			programName: "Revision Program",
		}).returning();
		await db.update(proposals).set({ bannerProgramId: bannerProgram.bannerProgramId })
			.where(eq(proposals.proposalId, proposal.proposalId));
		await processReview(chair, proposal.proposalId, { decision: "Endorsed" });
		await processReview(director, proposal.proposalId, { decision: "Returned", comments: "Clarify the timeline" });
		await db.insert(proposalDocuments).values({ proposalId: proposal.proposalId, storagePath: "proposals/revised.pdf", versionNum: 2 });
		const request = (await listRevisionRequests(leader, proposal.proposalId, { page: 1, limit: 20 })).items[0];
		await saveRevisionResponse(leader, proposal.proposalId, request.requestId, { responseType: "Changed", explanation: "Clarified the timeline" }, "127.0.0.1");
		const app = new OpenAPIHono<AuthEnv>();
		app.use("*", async (context, next) => {
			context.set("user", leader);
			await next();
		});
		app.route("/", submitRoutes);
		installApiErrorHandler(app);
		const response = await app.request(`/proposals/${proposal.proposalId}/submit`, { method: "POST" });
		expect(response.status, JSON.stringify(await response.json())).toBe(200);
		await expect(processReview(director, proposal.proposalId, { decision: "Approved" }))
			.rejects.toMatchObject({ code: "INVALID_STATE" });
		await processReview(chair, proposal.proposalId, { decision: "Endorsed" });
		const responseToVerify = (await listRevisionRequests(director, proposal.proposalId, { page: 1, limit: 20 })).items[0].responses[0];
		await verifyRevisionResponse(director, proposal.proposalId, request.requestId, { responseId: responseToVerify.responseId, decision: "Resolved" }, "127.0.0.1");
		await processReview(director, proposal.proposalId, { decision: "Approved" });
		const [saved] = await db.select().from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		expect(saved).toMatchObject({ status: PROPOSAL_STATUS.APPROVED, revisionNum: 1 });
	});

	it("keeps legacy progressed projects visible without allowing pending bypassed proposals into the Director hub", async () => {
		const organization = await seedOrganization("legacy-hub");
		const chair = await seedAuthUser(organization, {
			slug: "legacy-chair", roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "legacy-director", roleName: ROLE_NAMES.DIRECTOR, department: null,
		});
		const progressed = await seedProposal(organization, {
			title: "Legacy Ongoing", status: PROPOSAL_STATUS.APPROVED, bypassedRetChair: true,
		});
		const pending = await seedProposal(organization, {
			title: "Legacy Pending", bypassedRetChair: true,
		});
		await seedProposalMember(progressed.proposalId, chair.userId, "Project Leader");
		await seedProposalMember(pending.proposalId, chair.userId, "Project Leader");
		await seedProject(progressed.proposalId, { status: "Ongoing" });
		for (const viewer of [director, chair]) {
			const hub = await getHubProjects({ page: 1, limit: 10 }, viewer);
			expect(hub.total).toBe(1);
			expect(hub.items.map((item) => item.id)).toEqual([progressed.proposalId]);
		}
	});

	it("allows a Chair to directly endorse their own proposal without an endorsement document", async () => {
		const organization = await seedOrganization("chair-own-endorsement");
		const chair = await seedAuthUser(organization, {
			slug: "own-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const proposal = await seedProposal(organization, {
			title: "Chair Submission",
			bypassedRetChair: true,
		});
		await seedProposalMember(proposal.proposalId, chair.userId, "Project Leader");
		await processReview(chair, proposal.proposalId, { decision: "Endorsed" });
		const [saved] = await db.select().from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		expect(saved).toMatchObject({
			status: PROPOSAL_STATUS.ENDORSED,
			bypassedRetChair: false,
			endorsementDocPath: null,
		});
		expect(saved?.endorsedAt).toBeInstanceOf(Date);
	});

	it("persists RET endorsement, Director approval, review history, and project creation", async () => {
		const organization = await seedOrganization("review-lifecycle");
		const leader = await seedAuthUser(organization, {
			slug: "review-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "review-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "review-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Review Lifecycle Proposal",
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");

		await processReview(retChair, proposal.proposalId, {
			decision: "Endorsed",
			comments: "Ready for approval",
		});
		await processReview(director, proposal.proposalId, {
			decision: "Approved",
		});

		const [savedProposal] = await db
			.select({ status: proposals.status, revisionNum: proposals.revisionNum })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		const [reviewCount] = await db
			.select({ value: count() })
			.from(proposalReviews)
			.where(eq(proposalReviews.proposalId, proposal.proposalId));
		const [project] = await db
			.select({ projectStatus: projects.projectStatus })
			.from(projects)
			.where(eq(projects.proposalId, proposal.proposalId));

		expect(savedProposal).toEqual({
			status: PROPOSAL_STATUS.APPROVED,
			revisionNum: 0,
		});
		expect(Number(reviewCount?.value)).toBe(2);
		expect(project).toEqual({ projectStatus: "Approved" });
	});

	it("increments the revision and records a RET Chair return", async () => {
		const organization = await seedOrganization("review-return");
		const leader = await seedAuthUser(organization, {
			slug: "return-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "return-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const proposal = await seedProposal(organization, {
			title: "Returned Review Proposal",
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");

		await processReview(retChair, proposal.proposalId, {
			decision: "Returned",
			comments: "Please revise the scope",
		});

		const [savedProposal] = await db
			.select({ status: proposals.status, revisionNum: proposals.revisionNum })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		expect(savedProposal).toEqual({
			status: PROPOSAL_STATUS.RETURNED,
			revisionNum: 1,
		});
	});

	it("requires Chair endorsement of a legacy bypassed proposal before Director approval", async () => {
		const organization = await seedOrganization("review-bypass");
		const leader = await seedAuthUser(organization, {
			slug: "bypass-leader",
			roleName: ROLE_NAMES.FACULTY,
		});
		const retChair = await seedAuthUser(organization, {
			slug: "bypass-chair",
			roleName: ROLE_NAMES.RET_CHAIR,
		});
		const director = await seedAuthUser(organization, {
			slug: "bypass-director",
			roleName: ROLE_NAMES.DIRECTOR,
			department: null,
		});
		const proposal = await seedProposal(organization, {
			title: "Bypassed Review Proposal",
			bypassedRetChair: true,
		});
		await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");

		await expect(
			processReview(director, proposal.proposalId, { decision: "Approved" }),
		).rejects.toMatchObject({ code: "INVALID_STATE" });
		await processReview(retChair, proposal.proposalId, { decision: "Endorsed" });
		await processReview(director, proposal.proposalId, { decision: "Approved" });

		const [savedProposal] = await db
			.select({ status: proposals.status })
			.from(proposals)
			.where(eq(proposals.proposalId, proposal.proposalId));
		expect(savedProposal?.status).toBe(PROPOSAL_STATUS.APPROVED);
	});
});
