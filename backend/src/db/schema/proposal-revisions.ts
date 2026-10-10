import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { proposalComments } from "./proposal-comments.js";
import { proposalDocuments } from "./proposal-documents.js";
import { proposalReviews } from "./proposal-reviews.js";
import { proposalSubmissions } from "./proposal-submissions.js";
import { proposals } from "./proposals.js";
import { users } from "./users.js";

export type RevisionStatus =
	| "Response needed"
	| "Awaiting verification"
	| "Resolved"
	| "Further revision needed";
export type ResponseType = "Changed" | "Clarification";

export const proposalRevisionRequests = pgTable(
	"proposal_revision_requests",
	{
		requestId: uuid("request_id").primaryKey().defaultRandom(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => proposals.proposalId),
		commentId: uuid("comment_id").references(() => proposalComments.commentId),
		documentId: uuid("document_id").references(
			() => proposalDocuments.documentId,
		),
		submissionId: uuid("submission_id").references(
			() => proposalSubmissions.submissionId,
		),
		returnReviewId: uuid("return_review_id").references(
			() => proposalReviews.reviewId,
		),
		reviewStage: text("review_stage").notNull(),
		content: text("content").notNull(),
		createdBy: uuid("created_by")
			.notNull()
			.references(() => users.userId),
		status: text("status")
			.$type<RevisionStatus>()
			.notNull()
			.default("Response needed"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		proposalIdx: index("prr_proposal_stage_idx").on(
			table.proposalId,
			table.reviewStage,
			table.status,
		),
		commentIdx: uniqueIndex("prr_comment_idx").on(table.commentId),
	}),
);

export const proposalRevisionResponses = pgTable(
	"proposal_revision_responses",
	{
		responseId: uuid("response_id").primaryKey().defaultRandom(),
		requestId: uuid("request_id")
			.notNull()
			.references(() => proposalRevisionRequests.requestId),
		cycleReviewId: uuid("cycle_review_id")
			.notNull()
			.references(() => proposalReviews.reviewId),
		submissionId: uuid("submission_id").references(
			() => proposalSubmissions.submissionId,
		),
		responseType: text("response_type").$type<ResponseType>().notNull(),
		explanation: text("explanation").notNull(),
		revisedPage: integer("revised_page"),
		respondedBy: uuid("responded_by")
			.notNull()
			.references(() => users.userId),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		submittedAt: timestamp("submitted_at", { withTimezone: true }),
	},
	(table) => ({
		requestIdx: index("prresp_request_idx").on(table.requestId),
		draftIdx: uniqueIndex("prresp_draft_idx")
			.on(table.requestId, table.cycleReviewId)
			.where(sql`${table.submissionId} is null`),
	}),
);

export const proposalRevisionVerifications = pgTable(
	"proposal_revision_verifications",
	{
		verificationId: uuid("verification_id").primaryKey().defaultRandom(),
		responseId: uuid("response_id")
			.notNull()
			.references(() => proposalRevisionResponses.responseId),
		decision: text("decision")
			.$type<"Resolved" | "Further revision needed">()
			.notNull(),
		explanation: text("explanation"),
		verifiedBy: uuid("verified_by")
			.notNull()
			.references(() => users.userId),
		verifiedAt: timestamp("verified_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({ responseIdx: index("prv_response_idx").on(table.responseId) }),
);

/** Reopening is a new concern about a submission, not a rewrite of an old verification. */
export const proposalRevisionReopenings = pgTable(
	"proposal_revision_reopenings",
	{
		reopeningId: uuid("reopening_id").primaryKey().defaultRandom(),
		requestId: uuid("request_id")
			.notNull()
			.references(() => proposalRevisionRequests.requestId),
		submissionId: uuid("submission_id")
			.notNull()
			.references(() => proposalSubmissions.submissionId),
		explanation: text("explanation").notNull(),
		reopenedBy: uuid("reopened_by")
			.notNull()
			.references(() => users.userId),
		reopenedAt: timestamp("reopened_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		requestIdx: index("prreopen_request_idx").on(table.requestId),
	}),
);
