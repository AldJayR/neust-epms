import { and, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalComments } from "@/db/schema/proposal-comments.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposalReviews } from "@/db/schema/proposal-reviews.js";
import {
	proposalRevisionReopenings as reopenings,
	proposalRevisionRequests as requests,
	proposalRevisionResponses as responses,
	proposalRevisionVerifications as verifications,
} from "@/db/schema/proposal-revisions.js";
import { proposalSubmissions } from "@/db/schema/proposal-submissions.js";
import { proposals } from "@/db/schema/proposals.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { isProposalInScope } from "@/lib/scope-helpers.js";
import type { AuthUser } from "@/lib/types.js";
import { isProjectLeader } from "@/services/auth-user.service.js";

export type RevisionTransaction = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];
type Database = typeof db | RevisionTransaction;
type Proposal = typeof proposals.$inferSelect;

function stageFor(user: AuthUser) {
	return user.roleName === "RET Chair"
		? "Endorsement"
		: user.roleName === "Director"
			? "Approval"
			: null;
}

async function loadProposal(
	user: AuthUser,
	id: string,
	connection: Database,
	lock = false,
) {
	const query = connection
		.select()
		.from(proposals)
		.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
		.limit(1);
	const [proposal] = await (lock ? query.for("update") : query);
	if (!proposal) throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	if (!isProposalInScope(user, proposal))
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to this proposal",
		);
	return proposal;
}

async function canReview(
	user: AuthUser,
	proposal: Proposal,
	connection: Database,
) {
	const stage = stageFor(user);
	const active =
		stage === "Endorsement"
			? proposal.status === "Pending Review"
			: stage === "Approval" && proposal.status === "Endorsed";
	return (
		!!active &&
		(stage === "Endorsement" ||
			!(await isProjectLeader(proposal.proposalId, user.userId, connection)))
	);
}

export async function requireRevisionReviewer(
	user: AuthUser,
	id: string,
	tx: RevisionTransaction,
) {
	const proposal = await loadProposal(user, id, tx, true);
	const stage = stageFor(user);
	if (!stage || !(await canReview(user, proposal, tx)))
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Your role cannot review this proposal at its current stage",
		);
	return { proposal, stage };
}

async function latestSubmission(id: string, connection: Database) {
	const [submission] = await connection
		.select()
		.from(proposalSubmissions)
		.where(eq(proposalSubmissions.proposalId, id))
		.orderBy(desc(proposalSubmissions.sequence))
		.limit(1);
	return submission;
}

async function latestDocument(id: string, connection: Database) {
	const [document] = await connection
		.select()
		.from(proposalDocuments)
		.where(eq(proposalDocuments.proposalId, id))
		.orderBy(desc(proposalDocuments.versionNum))
		.limit(1);
	return document;
}

async function latestReturn(id: string, connection: Database) {
	const [review] = await connection
		.select()
		.from(proposalReviews)
		.where(
			and(
				eq(proposalReviews.proposalId, id),
				eq(proposalReviews.decision, "Returned"),
			),
		)
		.orderBy(desc(proposalReviews.reviewedAt))
		.limit(1);
	return review;
}

export async function assertCurrentReviewDocument(
	id: string,
	documentId: string,
	tx: RevisionTransaction,
) {
	const submission = await latestSubmission(id, tx);
	const currentId =
		submission?.documentId ?? (await latestDocument(id, tx))?.documentId;
	if (currentId !== documentId)
		throw new ApiError(
			409,
			"OLD_DOCUMENT",
			"Add new feedback to the currently submitted PDF, not an earlier version",
		);
	return submission?.submissionId ?? null;
}

export async function createCommentRevisionRequest(
	user: AuthUser,
	proposalId: string,
	documentId: string,
	commentId: string,
	content: string,
	stage: string,
	submissionId: string | null,
	tx: RevisionTransaction,
) {
	await tx.insert(requests).values({
		proposalId,
		documentId,
		commentId,
		content,
		reviewStage: stage,
		submissionId,
		createdBy: user.userId,
	});
}

export async function createRevisionRequest(
	user: AuthUser,
	id: string,
	input: { commentId?: string | undefined; content?: string | undefined },
	ipAddress: string,
) {
	return db.transaction(async (tx) => {
		const { stage } = await requireRevisionReviewer(user, id, tx);
		const submission = await latestSubmission(id, tx);
		let documentId =
			submission?.documentId ??
			(await latestDocument(id, tx))?.documentId ??
			null;
		let content = input.content ?? "";
		let sourceSubmissionId = submission?.submissionId ?? null;
		if (input.commentId) {
			const [comment] = await tx
				.select({
					content: proposalComments.content,
					documentId: proposalComments.documentId,
				})
				.from(proposalComments)
				.innerJoin(
					proposalDocuments,
					eq(proposalComments.documentId, proposalDocuments.documentId),
				)
				.where(
					and(
						eq(proposalComments.commentId, input.commentId),
						eq(proposalDocuments.proposalId, id),
					),
				)
				.limit(1);
			if (!comment) throw new ApiError(404, "NOT_FOUND", "Comment not found");
			documentId = comment.documentId;
			content = comment.content;
			if (documentId !== submission?.documentId) sourceSubmissionId = null;
			const [existing] = await tx
				.select()
				.from(requests)
				.where(eq(requests.commentId, input.commentId))
				.limit(1);
			if (existing)
				throw new ApiError(
					409,
					"EXISTS",
					"This comment is already a revision request",
				);
			await tx
				.update(proposalComments)
				.set({ classification: "Revision required" })
				.where(eq(proposalComments.commentId, input.commentId));
		}
		const [created] = await tx
			.insert(requests)
			.values({
				proposalId: id,
				commentId: input.commentId ?? null,
				documentId,
				submissionId: sourceSubmissionId,
				content,
				createdBy: user.userId,
				reviewStage: stage,
			})
			.returning();
		if (!created)
			throw new ApiError(
				500,
				"INSERT_FAILED",
				"Failed to create revision request",
			);
		await insertAuditLog(
			{
				userId: user.userId,
				action: `Created revision request ${created.requestId}`,
				tableAffected: "proposal_revision_requests",
				ipAddress,
			},
			tx,
		);
		return created;
	});
}

export async function saveRevisionResponse(
	user: AuthUser,
	id: string,
	requestId: string,
	input: {
		responseType: "Changed" | "Clarification";
		explanation: string;
		revisedPage?: number | null | undefined;
	},
	ipAddress: string,
) {
	return db.transaction(async (tx) => {
		const proposal = await loadProposal(user, id, tx, true);
		if (
			proposal.status !== "Returned" ||
			!(await isProjectLeader(id, user.userId, tx))
		)
			throw new ApiError(
				403,
				"FORBIDDEN",
				"Only the project leader can respond while the proposal is returned",
			);
		const [request] = await tx
			.select()
			.from(requests)
			.where(
				and(eq(requests.requestId, requestId), eq(requests.proposalId, id)),
			)
			.limit(1);
		if (!request)
			throw new ApiError(404, "NOT_FOUND", "Revision request not found");
		if (request.status === "Resolved")
			throw new ApiError(409, "RESOLVED", "This request is already resolved");
		const cycle = await latestReturn(id, tx);
		if (!cycle)
			throw new ApiError(409, "NO_RETURN", "Return decision not found");
		const [draft] = await tx
			.select()
			.from(responses)
			.where(
				and(
					eq(responses.requestId, requestId),
					eq(responses.cycleReviewId, cycle.reviewId),
					isNull(responses.submissionId),
				),
			)
			.limit(1);
		const values = {
			responseType: input.responseType,
			explanation: input.explanation.trim(),
			revisedPage: input.revisedPage ?? null,
			respondedBy: user.userId,
			updatedAt: new Date(),
		};
		if (!values.explanation)
			throw new ApiError(
				400,
				"RESPONSE_REQUIRED",
				"Explain how you handled this request",
			);
		if (draft)
			await tx
				.update(responses)
				.set(values)
				.where(eq(responses.responseId, draft.responseId));
		else
			await tx
				.insert(responses)
				.values({ ...values, requestId, cycleReviewId: cycle.reviewId });
		await insertAuditLog(
			{
				userId: user.userId,
				action: `Saved draft response for revision request ${requestId}`,
				tableAffected: "proposal_revision_responses",
				ipAddress,
			},
			tx,
		);
	});
}

export async function recordRevisionSubmission(
	user: AuthUser,
	proposal: Proposal,
	tx: RevisionTransaction,
) {
	const document = await latestDocument(proposal.proposalId, tx);
	if (!document)
		throw new ApiError(
			400,
			"DOCUMENT_REQUIRED",
			"Upload the proposal PDF before submitting",
		);
	const previous = await latestSubmission(proposal.proposalId, tx);
	const outstanding = await tx
		.select()
		.from(requests)
		.where(
			and(
				eq(requests.proposalId, proposal.proposalId),
				ne(requests.status, "Resolved"),
			),
		);
	const cycle =
		proposal.status === "Returned"
			? await latestReturn(proposal.proposalId, tx)
			: undefined;
	const drafts =
		cycle && outstanding.length
			? await tx
					.select()
					.from(responses)
					.where(
						and(
							inArray(
								responses.requestId,
								outstanding.map((item) => item.requestId),
							),
							eq(responses.cycleReviewId, cycle.reviewId),
							isNull(responses.submissionId),
						),
					)
			: [];
	if (
		outstanding.some(
			(item) =>
				!drafts.some(
					(draft) =>
						draft.requestId === item.requestId && draft.explanation.trim(),
				),
		)
	)
		throw new ApiError(
			400,
			"REVISION_RESPONSES_REQUIRED",
			"Save a response to every outstanding revision request before resubmitting",
		);
	const [submission] = await tx
		.insert(proposalSubmissions)
		.values({
			proposalId: proposal.proposalId,
			documentId: document.documentId,
			sequence: (previous?.sequence ?? 0) + 1,
			submittedBy: user.userId,
		})
		.returning();
	if (!submission)
		throw new ApiError(
			500,
			"INSERT_FAILED",
			"Failed to record proposal submission",
		);
	if (drafts.length) {
		await tx
			.update(responses)
			.set({ submissionId: submission.submissionId, submittedAt: new Date() })
			.where(
				inArray(
					responses.responseId,
					drafts.map((item) => item.responseId),
				),
			);
		await tx
			.update(requests)
			.set({ status: "Awaiting verification" })
			.where(
				inArray(
					requests.requestId,
					outstanding.map((item) => item.requestId),
				),
			);
	}
	return submission;
}

export async function prepareRevisionReview(
	proposalId: string,
	stage: string,
	decision: string,
	tx: RevisionTransaction,
) {
	if (decision === "Endorsed" || decision === "Approved") {
		const [outstanding] = await tx
			.select({ requestId: requests.requestId })
			.from(requests)
			.where(
				and(
					eq(requests.proposalId, proposalId),
					eq(requests.reviewStage, stage),
					ne(requests.status, "Resolved"),
				),
			)
			.limit(1);
		if (outstanding)
			throw new ApiError(
				409,
				"UNVERIFIED_REVISIONS",
				"Verify all outstanding revision requests for your stage before endorsing or approving",
			);
	}
	return (await latestSubmission(proposalId, tx))?.submissionId ?? null;
}

export async function recordRevisionReturn(
	user: AuthUser,
	proposalId: string,
	stage: string,
	reviewId: string,
	comments: string | undefined,
	tx: RevisionTransaction,
) {
	const open = await tx
		.select()
		.from(requests)
		.where(
			and(
				eq(requests.proposalId, proposalId),
				eq(requests.reviewStage, stage),
				ne(requests.status, "Resolved"),
			),
		);
	if (!open.length) {
		const content = comments?.trim();
		if (!content)
			throw new ApiError(
				400,
				"RETURN_REASON_REQUIRED",
				"Describe what needs revision when returning without actionable comments",
			);
		const submission = await latestSubmission(proposalId, tx);
		await tx.insert(requests).values({
			proposalId,
			content,
			reviewStage: stage,
			returnReviewId: reviewId,
			createdBy: user.userId,
			submissionId: submission?.submissionId ?? null,
			documentId:
				submission?.documentId ??
				(await latestDocument(proposalId, tx))?.documentId ??
				null,
		});
	} else {
		await tx
			.update(requests)
			.set({
				status: "Response needed",
				returnReviewId: sql`coalesce(${requests.returnReviewId}, ${reviewId}::uuid)`,
			})
			.where(
				inArray(
					requests.requestId,
					open.map((item) => item.requestId),
				),
			);
	}
}

export async function verifyRevisionResponse(
	user: AuthUser,
	id: string,
	requestId: string,
	input: {
		responseId: string;
		decision: "Resolved" | "Further revision needed";
		explanation?: string | undefined;
	},
	ipAddress: string,
) {
	return db.transaction(async (tx) => {
		const { stage } = await requireRevisionReviewer(user, id, tx);
		const [request] = await tx
			.select()
			.from(requests)
			.where(
				and(eq(requests.requestId, requestId), eq(requests.proposalId, id)),
			)
			.limit(1);
		if (!request)
			throw new ApiError(404, "NOT_FOUND", "Revision request not found");
		if (request.reviewStage !== stage)
			throw new ApiError(
				403,
				"WRONG_STAGE",
				"You may only verify requests owned by your review stage",
			);
		if (request.status !== "Awaiting verification")
			throw new ApiError(
				409,
				"NOT_READY",
				"This request is not awaiting verification",
			);
		const [response] = await tx
			.select()
			.from(responses)
			.where(
				and(
					eq(responses.responseId, input.responseId),
					eq(responses.requestId, requestId),
				),
			)
			.limit(1);
		const submission = await latestSubmission(id, tx);
		if (
			!response?.submissionId ||
			response.submissionId !== submission?.submissionId
		)
			throw new ApiError(
				409,
				"OLD_RESPONSE",
				"Verify the response for the current submission",
			);
		if (
			input.decision === "Further revision needed" &&
			!input.explanation?.trim()
		)
			throw new ApiError(
				400,
				"EXPLANATION_REQUIRED",
				"Explain what still needs revision",
			);
		await tx.insert(verifications).values({
			responseId: response.responseId,
			decision: input.decision,
			explanation: input.explanation?.trim() || null,
			verifiedBy: user.userId,
		});
		await tx
			.update(requests)
			.set({ status: input.decision })
			.where(eq(requests.requestId, requestId));
		await insertAuditLog(
			{
				userId: user.userId,
				action: `Verified revision request ${requestId}: ${input.decision}`,
				tableAffected: "proposal_revision_verifications",
				ipAddress,
			},
			tx,
		);
	});
}

export async function reopenRevisionRequest(
	user: AuthUser,
	id: string,
	requestId: string,
	input: { explanation: string },
	ipAddress: string,
) {
	return db.transaction(async (tx) => {
		const { stage } = await requireRevisionReviewer(user, id, tx);
		const [request] = await tx
			.select()
			.from(requests)
			.where(
				and(eq(requests.requestId, requestId), eq(requests.proposalId, id)),
			)
			.limit(1);
		if (!request)
			throw new ApiError(404, "NOT_FOUND", "Revision request not found");
		if (request.reviewStage !== stage)
			throw new ApiError(
				403,
				"WRONG_STAGE",
				"You may only reopen requests owned by your review stage",
			);
		if (request.status !== "Resolved")
			throw new ApiError(
				409,
				"NOT_RESOLVED",
				"Only resolved requests can be reopened",
			);
		const explanation = input.explanation.trim();
		if (!explanation)
			throw new ApiError(
				400,
				"EXPLANATION_REQUIRED",
				"Explain why this request needs reopening",
			);
		const submission = await latestSubmission(id, tx);
		if (!submission)
			throw new ApiError(
				409,
				"NO_SUBMISSION",
				"There is no submitted revision to review",
			);
		await tx.insert(reopenings).values({
			requestId,
			submissionId: submission.submissionId,
			explanation,
			reopenedBy: user.userId,
		});
		await tx
			.update(requests)
			.set({ status: "Further revision needed" })
			.where(eq(requests.requestId, requestId));
		await insertAuditLog(
			{
				userId: user.userId,
				action: `Reopened revision request ${requestId}`,
				tableAffected: "proposal_revision_reopenings",
				newValue: {
					requestId,
					submissionId: submission.submissionId,
					explanation,
				},
				ipAddress,
			},
			tx,
		);
	});
}

export async function revisionReadiness(user: AuthUser, id: string) {
	const proposal = await loadProposal(user, id, db);
	const [outstanding, cycle, document, leader, reviewer] = await Promise.all([
		db
			.select()
			.from(requests)
			.where(and(eq(requests.proposalId, id), ne(requests.status, "Resolved"))),
		latestReturn(id, db),
		latestDocument(id, db),
		isProjectLeader(id, user.userId),
		canReview(user, proposal, db),
	]);
	const drafts =
		cycle && outstanding.length
			? await db
					.select()
					.from(responses)
					.where(
						and(
							inArray(
								responses.requestId,
								outstanding.map((item) => item.requestId),
							),
							eq(responses.cycleReviewId, cycle.reviewId),
							isNull(responses.submissionId),
						),
					)
			: [];
	const answered = drafts.filter((draft) => !!draft.explanation.trim()).length;
	const revisedDocumentReady =
		!!document && (!cycle || document.uploadedAt > cycle.reviewedAt);
	const canRespond = proposal.status === "Returned" && leader;
	return {
		status: proposal.status,
		canRespond,
		canReview: reviewer,
		stage: stageFor(user),
		outstanding: outstanding.length,
		answered,
		stageOutstanding: outstanding.filter(
			(item) => item.reviewStage === stageFor(user),
		).length,
		revisedDocumentReady,
		latestDocumentId: document?.documentId ?? null,
		canResubmit:
			canRespond && revisedDocumentReady && answered === outstanding.length,
	};
}

export async function listRevisionRequests(
	user: AuthUser,
	id: string,
	query: {
		page: number;
		limit: number;
		status?: string | undefined;
		stage?: string | undefined;
	},
) {
	const proposal = await loadProposal(user, id, db);
	const filters = and(
		eq(requests.proposalId, id),
		query.status === "Active"
			? ne(requests.status, "Resolved")
			: query.status
				? eq(
						requests.status,
						query.status as typeof requests.$inferSelect.status,
					)
				: undefined,
		query.stage ? eq(requests.reviewStage, query.stage) : undefined,
	);
	const [rows, totals, cycle, submission, leader, reviewer] = await Promise.all(
		[
			db
				.select({
					request: requests,
					name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
					version: proposalDocuments.versionNum,
					annotation: proposalComments.annotationJson,
				})
				.from(requests)
				.innerJoin(users, eq(requests.createdBy, users.userId))
				.leftJoin(
					proposalDocuments,
					eq(requests.documentId, proposalDocuments.documentId),
				)
				.leftJoin(
					proposalComments,
					eq(requests.commentId, proposalComments.commentId),
				)
				.where(filters)
				.orderBy(desc(requests.createdAt), desc(requests.requestId))
				.limit(query.limit)
				.offset((query.page - 1) * query.limit),
			db.select({ total: count() }).from(requests).where(filters),
			latestReturn(id, db),
			latestSubmission(id, db),
			isProjectLeader(id, user.userId),
			canReview(user, proposal, db),
		],
	);
	const ids = rows.map((row) => row.request.requestId);
	const replyRows = ids.length
		? await db
				.select({
					response: responses,
					name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
					documentId: proposalSubmissions.documentId,
					version: proposalDocuments.versionNum,
				})
				.from(responses)
				.innerJoin(users, eq(responses.respondedBy, users.userId))
				.leftJoin(
					proposalSubmissions,
					eq(responses.submissionId, proposalSubmissions.submissionId),
				)
				.leftJoin(
					proposalDocuments,
					eq(proposalSubmissions.documentId, proposalDocuments.documentId),
				)
				.where(inArray(responses.requestId, ids))
				.orderBy(desc(responses.updatedAt))
		: [];
	const replyIds = replyRows.map((row) => row.response.responseId);
	const reopeningRows = ids.length
		? await db
				.select({
					reopening: reopenings,
					name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
					documentId: proposalSubmissions.documentId,
					version: proposalDocuments.versionNum,
				})
				.from(reopenings)
				.innerJoin(users, eq(reopenings.reopenedBy, users.userId))
				.innerJoin(
					proposalSubmissions,
					eq(reopenings.submissionId, proposalSubmissions.submissionId),
				)
				.innerJoin(
					proposalDocuments,
					eq(proposalSubmissions.documentId, proposalDocuments.documentId),
				)
				.where(inArray(reopenings.requestId, ids))
				.orderBy(desc(reopenings.reopenedAt))
		: [];
	const decisions = replyIds.length
		? await db
				.select({
					verification: verifications,
					name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
				})
				.from(verifications)
				.innerJoin(users, eq(verifications.verifiedBy, users.userId))
				.where(inArray(verifications.responseId, replyIds))
				.orderBy(desc(verifications.verifiedAt))
		: [];
	const items = rows.map(({ request, name, version, annotation }) => {
		const replies = replyRows.filter(
			(row) => row.response.requestId === request.requestId,
		);
		const format = (row: (typeof replyRows)[number]) => ({
			responseId: row.response.responseId,
			responseType: row.response.responseType,
			explanation: row.response.explanation,
			revisedPage: row.response.revisedPage,
			documentId: row.documentId,
			version: row.version,
			respondedBy: row.name,
			updatedAt: row.response.updatedAt.toISOString(),
			submittedAt: row.response.submittedAt?.toISOString() ?? null,
			verifications: decisions
				.filter(
					(decision) =>
						decision.verification.responseId === row.response.responseId,
				)
				.map(({ verification, name: verifier }) => ({
					decision: verification.decision,
					explanation: verification.explanation,
					verifiedBy: verifier,
					verifiedAt: verification.verifiedAt.toISOString(),
				})),
		});
		const draft = replies.find(
			(row) =>
				row.response.submissionId === null &&
				row.response.cycleReviewId === cycle?.reviewId,
		);
		const current = replies.find(
			(row) => row.response.submissionId === submission?.submissionId,
		);
		return {
			requestId: request.requestId,
			content: request.content,
			reviewStage: request.reviewStage,
			status: request.status,
			createdBy: name,
			createdAt: request.createdAt.toISOString(),
			commentId: request.commentId,
			documentId: request.documentId,
			version,
			originalPage: annotation?.page ?? null,
			canRespond:
				proposal.status === "Returned" &&
				leader &&
				request.status !== "Resolved",
			canVerify:
				reviewer &&
				request.reviewStage === stageFor(user) &&
				!!current &&
				request.status === "Awaiting verification",
			canReopen:
				reviewer &&
				request.reviewStage === stageFor(user) &&
				request.status === "Resolved" &&
				!!submission,
			reopenings: reopeningRows
				.filter((row) => row.reopening.requestId === request.requestId)
				.map((row) => ({
					reopeningId: row.reopening.reopeningId,
					documentId: row.documentId,
					version: row.version,
					explanation: row.reopening.explanation,
					reopenedBy: row.name,
					reopenedAt: row.reopening.reopenedAt.toISOString(),
				})),
			draft: draft ? format(draft) : null,
			responses: replies
				.filter((row) => row.response.submissionId !== null)
				.map(format),
		};
	});
	return {
		items,
		total: totals[0]?.total ?? 0,
		page: query.page,
		limit: query.limit,
	};
}
