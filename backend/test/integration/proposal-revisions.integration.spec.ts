import { OpenAPIHono } from "@hono/zod-openapi";
import { desc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client.js";
import { proposalComments } from "@/db/schema/proposal-comments.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalRevisionResponses } from "@/db/schema/proposal-revisions.js";
import { proposalSubmissions } from "@/db/schema/proposal-submissions.js";
import { installApiErrorHandler } from "@/lib/errors.js";
import type { AuthUser } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import comments from "@/modules/proposals/comments.routes.js";
import revisions from "@/modules/proposals/revisions.routes.js";
import { processReview, submitProposal } from "@/modules/proposals/proposals.service.js";
import { createRevisionRequest, listRevisionRequests, reopenRevisionRequest, revisionReadiness, saveRevisionResponse, verifyRevisionResponse } from "@/modules/proposals/revisions.service.js";
import { seedAuthUser, seedOrganization, seedProposal, seedProposalMember, seedProposalRelations } from "./fixtures.js";

async function setup() {
	const org = await seedOrganization("revision-tracking");
	const leader = await seedAuthUser(org, { slug: "revision-owner", roleName: "Faculty" });
	const chair = await seedAuthUser(org, { slug: "revision-reviewer", roleName: "RET Chair" });
	const alternate = await seedAuthUser(org, { slug: "alternate-reviewer", roleName: "RET Chair" });
	const director = await seedAuthUser(org, { slug: "director-reviewer", roleName: "Director", department: null });
	const other = await seedAuthUser(org, { slug: "other-faculty", roleName: "Faculty" });
	const proposal = await seedProposal(org, { title: "Revision Tracking", status: "Draft", targetStartDate: new Date("2099-01-01"), targetEndDate: new Date("2099-12-31") });
	await seedProposalMember(proposal.proposalId, leader.userId, "Project Leader");
	await seedProposalMember(proposal.proposalId, other.userId, "Member");
	await seedProposalRelations(proposal.proposalId);
	await submitProposal(leader, proposal.proposalId, "127.0.0.1");
	const [document] = await db.select().from(proposalDocuments).where(eq(proposalDocuments.proposalId, proposal.proposalId)).limit(1);
	return { id: proposal.proposalId, document, leader, chair, alternate, director, other };
}

async function revisedPdf(id: string, version: number) {
	const [document] = await db.insert(proposalDocuments).values({ proposalId: id, storagePath: `proposals/revision-${version}.pdf`, versionNum: version }).returning();
	return document;
}

function appFor(user: AuthUser) {
	const app = new OpenAPIHono<AuthEnv>();
	app.use("*", async (context, next) => { context.set("user", user); await next(); });
	app.route("/", comments);
	app.route("/", revisions);
	installApiErrorHandler(app);
	return app;
}

describe("proposal revision responses and verification", () => {
	it("reopens a resolved historical Chair request after a Director return without rewriting earlier verification", async () => {
		const { id, leader, chair, alternate, director } = await setup();
		await createRevisionRequest(chair, id, { content: "Define the success threshold" }, "127.0.0.1");
		await processReview(chair, id, { decision: "Returned" });
		const chairRequest = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		await revisedPdf(id, 2);
		await saveRevisionResponse(leader, id, chairRequest.requestId, { responseType: "Changed", explanation: "Added the threshold", revisedPage: 3 }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		const acceptedResponse = (await listRevisionRequests(chair, id, { page: 1, limit: 20 })).items[0].responses[0];
		await verifyRevisionResponse(chair, id, chairRequest.requestId, { responseId: acceptedResponse.responseId, decision: "Resolved" }, "127.0.0.1");
		await processReview(chair, id, { decision: "Endorsed" });
		await processReview(director, id, { decision: "Returned", comments: "Justify the budget" });
		const directorRequest = (await listRevisionRequests(leader, id, { page: 1, limit: 20, stage: "Approval" })).items[0];
		await revisedPdf(id, 3);
		await saveRevisionResponse(leader, id, directorRequest.requestId, { responseType: "Changed", explanation: "Added budget justification" }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		const resolved = (await listRevisionRequests(alternate, id, { page: 1, limit: 20, stage: "Endorsement", status: "Resolved" })).items[0];
		expect(resolved).toMatchObject({ canReopen: true, canVerify: false });
		await expect(reopenRevisionRequest(alternate, id, chairRequest.requestId, { explanation: "   " }, "127.0.0.1")).rejects.toMatchObject({ code: "EXPLANATION_REQUIRED" });
		await expect(reopenRevisionRequest(chair, id, directorRequest.requestId, { explanation: "Wrong reviewer stage" }, "127.0.0.1")).rejects.toMatchObject({ code: "WRONG_STAGE" });
		const reopened = await appFor(alternate).request(`/proposals/${id}/revision-requests/${chairRequest.requestId}/reopen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ explanation: "Version 3 removed the previously accepted threshold" }) });
		expect(reopened.status).toBe(200);
		await expect(reopenRevisionRequest(alternate, id, chairRequest.requestId, { explanation: "Duplicate reopening" }, "127.0.0.1")).rejects.toMatchObject({ code: "NOT_RESOLVED" });
		const history = (await listRevisionRequests(leader, id, { page: 1, limit: 20, stage: "Endorsement" })).items[0];
		expect(history.status).toBe("Further revision needed");
		expect(history.reopenings).toHaveLength(1);
		expect(history.reopenings[0]).toMatchObject({ version: 3, explanation: "Version 3 removed the previously accepted threshold" });
		expect(history.reopenings[0].reopenedBy).toContain("alternate-reviewer");
		expect(history.responses).toHaveLength(1);
		expect(history.responses[0]).toMatchObject({ responseId: acceptedResponse.responseId, version: 2, explanation: "Added the threshold" });
		expect(history.responses[0].verifications).toHaveLength(1);
		expect(history.responses[0].verifications[0].decision).toBe("Resolved");
		await expect(processReview(chair, id, { decision: "Endorsed" })).rejects.toMatchObject({ code: "UNVERIFIED_REVISIONS" });
		await processReview(chair, id, { decision: "Returned", comments: "Restore the accepted threshold" });
		await revisedPdf(id, 4);
		await expect(submitProposal(leader, id, "127.0.0.1")).rejects.toMatchObject({ code: "REVISION_RESPONSES_REQUIRED" });
		await saveRevisionResponse(leader, id, chairRequest.requestId, { responseType: "Changed", explanation: "Restored the threshold" }, "127.0.0.1");
		await saveRevisionResponse(leader, id, directorRequest.requestId, { responseType: "Clarification", explanation: "Budget justification retained" }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		await expect(verifyRevisionResponse(chair, id, chairRequest.requestId, { responseId: acceptedResponse.responseId, decision: "Resolved" }, "127.0.0.1")).rejects.toMatchObject({ code: "OLD_RESPONSE" });
		const fresh = (await listRevisionRequests(chair, id, { page: 1, limit: 20, stage: "Endorsement" })).items[0];
		expect(fresh.responses).toHaveLength(2);
		expect(fresh.reopenings).toHaveLength(1);
		await verifyRevisionResponse(chair, id, chairRequest.requestId, { responseId: fresh.responses[0].responseId, decision: "Resolved" }, "127.0.0.1");
		await processReview(chair, id, { decision: "Endorsed" });
	});

	it("tracks annotated requests across versions and allows another same-stage reviewer to verify", async () => {
		const { id, document, leader, chair, alternate } = await setup();
		const created = await appFor(chair).request(`/proposals/${id}/documents/${document.documentId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Clarify assessment criteria", classification: "Revision required", annotationJson: { x: 10, y: 10, width: 20, height: 5, page: 2 } }) });
		expect(created.status).toBe(201);
		await expect(processReview(chair, id, { decision: "Endorsed" })).rejects.toMatchObject({ code: "UNVERIFIED_REVISIONS" });
		await processReview(chair, id, { decision: "Returned", comments: "Please address the highlighted concern" });
		const request = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		expect(request).toMatchObject({ originalPage: 2, version: 1, status: "Response needed", canRespond: true });
		await revisedPdf(id, 2);
		await expect(submitProposal(leader, id, "127.0.0.1")).rejects.toMatchObject({ code: "REVISION_RESPONSES_REQUIRED" });
		await saveRevisionResponse(leader, id, request.requestId, { responseType: "Changed", explanation: "Added assessment criteria", revisedPage: 3 }, "127.0.0.1");
		expect(await revisionReadiness(leader, id)).toMatchObject({ answered: 1, outstanding: 1, canResubmit: true });
		await submitProposal(leader, id, "127.0.0.1");
		const submitted = (await listRevisionRequests(alternate, id, { page: 1, limit: 20 })).items[0];
		expect(submitted).toMatchObject({ status: "Awaiting verification", canVerify: true, draft: null });
		expect(submitted.responses[0]).toMatchObject({ version: 2, explanation: "Added assessment criteria" });
		await expect(saveRevisionResponse(leader, id, request.requestId, { responseType: "Changed", explanation: "Edited after submit" }, "127.0.0.1")).rejects.toMatchObject({ code: "FORBIDDEN" });
		await verifyRevisionResponse(alternate, id, request.requestId, { responseId: submitted.responses[0].responseId, decision: "Resolved" }, "127.0.0.1");
		await processReview(chair, id, { decision: "Endorsed" });
		const resolved = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		expect(resolved.responses[0].verifications[0].verifiedBy).toContain("alternate-reviewer");
		expect((await db.select().from(proposalComments).where(eq(proposalComments.documentId, document.documentId)))).toHaveLength(1);
	});

	it("keeps Director feedback pending through Chair re-endorsement and gates Director approval", async () => {
		const { id, leader, chair, director } = await setup();
		await processReview(chair, id, { decision: "Endorsed" });
		await processReview(director, id, { decision: "Returned", comments: "Justify the equipment budget" });
		const request = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		expect(request.reviewStage).toBe("Approval");
		await revisedPdf(id, 2);
		await saveRevisionResponse(leader, id, request.requestId, { responseType: "Clarification", explanation: "Equipment costs follow the existing partner quotations" }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		const reply = (await listRevisionRequests(chair, id, { page: 1, limit: 20 })).items[0].responses[0];
		await expect(verifyRevisionResponse(chair, id, request.requestId, { responseId: reply.responseId, decision: "Resolved" }, "127.0.0.1")).rejects.toMatchObject({ code: "WRONG_STAGE" });
		await processReview(chair, id, { decision: "Endorsed" });
		await expect(processReview(director, id, { decision: "Approved" })).rejects.toMatchObject({ code: "UNVERIFIED_REVISIONS" });
		await verifyRevisionResponse(director, id, request.requestId, { responseId: reply.responseId, decision: "Resolved" }, "127.0.0.1");
		await processReview(director, id, { decision: "Approved" });
	});

	it("preserves response and verification history across repeated returns and rejects stale verification", async () => {
		const { id, leader, chair } = await setup();
		await createRevisionRequest(chair, id, { content: "Explain participant assessment" }, "127.0.0.1");
		await processReview(chair, id, { decision: "Returned" });
		const request = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		await revisedPdf(id, 2);
		await saveRevisionResponse(leader, id, request.requestId, { responseType: "Changed", explanation: "Added assessment method" }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		const oldReply = (await listRevisionRequests(chair, id, { page: 1, limit: 20 })).items[0].responses[0];
		await expect(verifyRevisionResponse(chair, id, request.requestId, { responseId: oldReply.responseId, decision: "Further revision needed" }, "127.0.0.1")).rejects.toMatchObject({ code: "EXPLANATION_REQUIRED" });
		await verifyRevisionResponse(chair, id, request.requestId, { responseId: oldReply.responseId, decision: "Further revision needed", explanation: "Also define the success threshold" }, "127.0.0.1");
		await processReview(chair, id, { decision: "Returned", comments: "Threshold still missing" });
		await revisedPdf(id, 3);
		await expect(submitProposal(leader, id, "127.0.0.1")).rejects.toMatchObject({ code: "REVISION_RESPONSES_REQUIRED" });
		await saveRevisionResponse(leader, id, request.requestId, { responseType: "Changed", explanation: "Added success threshold" }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		await expect(verifyRevisionResponse(chair, id, request.requestId, { responseId: oldReply.responseId, decision: "Resolved" }, "127.0.0.1")).rejects.toMatchObject({ code: "OLD_RESPONSE" });
		const history = (await listRevisionRequests(chair, id, { page: 1, limit: 20 })).items[0];
		expect(history.responses).toHaveLength(2);
		expect(history.responses[1].verifications[0].explanation).toBe("Also define the success threshold");
		expect(history.responses[0].version).toBe(3);
	});

	it("enforces permissions and only permits new comments on the current submission", async () => {
		const { id, document, leader, chair, other } = await setup();
		const path = `/proposals/${id}/documents/${document.documentId}/comments`;
		const init = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "Unauthorized annotation" }) };
		expect((await appFor(other).request(path, init)).status).toBe(403);
		await processReview(chair, id, { decision: "Returned", comments: "Update the methodology" });
		const request = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		await expect(saveRevisionResponse(other, id, request.requestId, { responseType: "Changed", explanation: "Not the leader" }, "127.0.0.1")).rejects.toMatchObject({ code: "FORBIDDEN" });
		await revisedPdf(id, 2);
		await saveRevisionResponse(leader, id, request.requestId, { responseType: "Changed", explanation: "Updated the methodology" }, "127.0.0.1");
		await submitProposal(leader, id, "127.0.0.1");
		expect((await appFor(chair).request(path, init)).status).toBe(409);
		const current = (await listRevisionRequests(chair, id, { page: 1, limit: 20 })).items[0];
		await expect(verifyRevisionResponse(other, id, request.requestId, { responseId: current.responses[0].responseId, decision: "Resolved" }, "127.0.0.1")).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("leaves legacy comments nonblocking unless explicitly promoted", async () => {
		const { id, document, chair } = await setup();
		const [legacy] = await db.insert(proposalComments).values({ documentId: document.documentId, userId: chair.userId, content: "Legacy concern" }).returning();
		expect(await revisionReadiness(chair, id)).toMatchObject({ stageOutstanding: 0 });
		await createRevisionRequest(chair, id, { commentId: legacy.commentId }, "127.0.0.1");
		expect(await revisionReadiness(chair, id)).toMatchObject({ stageOutstanding: 1 });
		await expect(createRevisionRequest(chair, id, { commentId: legacy.commentId }, "127.0.0.1")).rejects.toMatchObject({ code: "EXISTS" });
	});

	it("serializes duplicate resubmissions and freezes exactly one response snapshot", async () => {
		const { id, leader, chair } = await setup();
		await processReview(chair, id, { decision: "Returned", comments: "Add implementation details" });
		const request = (await listRevisionRequests(leader, id, { page: 1, limit: 20 })).items[0];
		await revisedPdf(id, 2);
		await saveRevisionResponse(leader, id, request.requestId, { responseType: "Changed", explanation: "Added implementation details" }, "127.0.0.1");
		const attempts = await Promise.allSettled([submitProposal(leader, id, "127.0.0.1"), submitProposal(leader, id, "127.0.0.1")]);
		expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
		expect(await db.select().from(proposalSubmissions).where(eq(proposalSubmissions.proposalId, id)).orderBy(desc(proposalSubmissions.sequence))).toHaveLength(2);
		expect(await db.select().from(proposalRevisionResponses).where(eq(proposalRevisionResponses.requestId, request.requestId))).toHaveLength(1);
	});
});
