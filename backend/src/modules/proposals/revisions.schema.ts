import { z } from "@hono/zod-openapi";

export const RevisionParams = z.object({
	id: z.uuid().openapi({ param: { name: "id", in: "path" } }),
	requestId: z.uuid().openapi({ param: { name: "requestId", in: "path" } }),
});
export const RevisionProposalParams = RevisionParams.pick({ id: true });
export const RevisionListQuery = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: z
		.enum([
			"Active",
			"Response needed",
			"Awaiting verification",
			"Resolved",
			"Further revision needed",
		])
		.optional(),
	stage: z.enum(["Endorsement", "Approval"]).optional(),
});
export const SaveRevisionResponseSchema = z.object({
	responseType: z.enum(["Changed", "Clarification"]),
	explanation: z.string().trim().min(1).max(10000),
	revisedPage: z.number().int().positive().nullable().optional(),
});
export const VerifyRevisionSchema = z
	.object({
		responseId: z.uuid(),
		decision: z.enum(["Resolved", "Further revision needed"]),
		explanation: z.string().trim().max(10000).optional(),
	})
	.refine(
		(input) =>
			input.decision !== "Further revision needed" || !!input.explanation,
		{
			message: "Explain what still needs revision",
			path: ["explanation"],
		},
	);
export const ReopenRevisionSchema = z.object({
	explanation: z
		.string()
		.trim()
		.min(1, "Explain why this request needs reopening")
		.max(10000),
});
export const CreateRevisionRequestSchema = z
	.object({
		commentId: z.uuid().optional(),
		content: z.string().trim().min(1).max(10000).optional(),
	})
	.refine((input) => !!input.commentId || !!input.content, {
		message: "Select a comment or describe the revision request",
	});

const ResponseSchema = z.object({
	responseId: z.uuid(),
	responseType: z.enum(["Changed", "Clarification"]),
	explanation: z.string(),
	revisedPage: z.number().nullable(),
	documentId: z.uuid().nullable(),
	version: z.number().nullable(),
	respondedBy: z.string(),
	updatedAt: z.string(),
	submittedAt: z.string().nullable(),
	verifications: z.array(
		z.object({
			decision: z.string(),
			explanation: z.string().nullable(),
			verifiedBy: z.string(),
			verifiedAt: z.string(),
		}),
	),
});
export const RevisionItemSchema = z.object({
	requestId: z.uuid(),
	content: z.string(),
	reviewStage: z.string(),
	status: z.string(),
	createdBy: z.string(),
	createdAt: z.string(),
	commentId: z.uuid().nullable(),
	documentId: z.uuid().nullable(),
	version: z.number().nullable(),
	originalPage: z.number().nullable(),
	canRespond: z.boolean(),
	canVerify: z.boolean(),
	canReopen: z.boolean(),
	reopenings: z.array(
		z.object({
			reopeningId: z.uuid(),
			documentId: z.uuid(),
			version: z.number(),
			explanation: z.string(),
			reopenedBy: z.string(),
			reopenedAt: z.string(),
		}),
	),
	draft: ResponseSchema.nullable(),
	responses: z.array(ResponseSchema),
});
export const RevisionListSchema = z.object({
	items: z.array(RevisionItemSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
});
export const RevisionReadinessSchema = z.object({
	status: z.string(),
	canRespond: z.boolean(),
	canReview: z.boolean(),
	stage: z.string().nullable(),
	outstanding: z.number(),
	answered: z.number(),
	stageOutstanding: z.number(),
	revisedDocumentReady: z.boolean(),
	latestDocumentId: z.uuid().nullable(),
	canResubmit: z.boolean(),
});
