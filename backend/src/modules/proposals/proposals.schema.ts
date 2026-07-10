import { z } from "@hono/zod-openapi";
import { ParamId } from "@/lib/schemas.js";
import {
	PROPOSAL_STATUS,
	type ProposalStatus,
	REVIEW_DECISION,
} from "@/lib/types.js";

const ProposalStatusQuerySchema = z.enum(
	Object.values(PROPOSAL_STATUS) as [ProposalStatus, ...ProposalStatus[]],
);

export const ProposalSchema = z
	.object({
		proposalId: z.string().uuid(),
		campusId: z.number(),
		departmentId: z.number().nullable(),
		title: z.string(),
		bannerProgram: z.string(),
		projectLocale: z.string(),
		extensionCategory: z.string(),
		budgetPartner: z.string().nullable(),
		budgetNeust: z.string().nullable(),
		status: z.string(),
		bypassedRetChair: z.boolean(),
		revisionNum: z.number(),
		targetStartDate: z.string().nullable().optional(),
		targetEndDate: z.string().nullable().optional(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
		leaderFirstName: z.string().nullable().optional(),
		leaderLastName: z.string().nullable().optional(),
		leaderAcademicRank: z.string().nullable().optional(),
		isMember: z.boolean().optional(),
	})
	.openapi("Proposal");

export const ProposalListSchema = z
	.object({ items: z.array(ProposalSchema), total: z.number() })
	.openapi("ProposalList");

export const RETDashboardStatsSchema = z
	.object({
		pendingReview: z.number(),
		approvedProjects: z.number(),
		deniedProjects: z.number(),
	})
	.openapi("RETDashboardStats");

export const CreateProposalSchema = z
	.object({
		campusId: z.number().int().positive(),
		departmentId: z.number().int().positive(),
		title: z.string().min(1),
		bannerProgram: z.string().min(1),
		projectLocale: z.string().min(1),
		extensionCategory: z.string().min(1),
		budgetPartner: z.coerce.number().nonnegative().finite().optional(),
		budgetNeust: z.coerce.number().nonnegative().finite().optional(),
		targetStartDate: z.string().datetime().optional(),
		targetEndDate: z.string().datetime().optional(),
		departmentIds: z.array(z.number().int().positive()).optional(),
		sectorIds: z.array(z.number().int().positive()).optional(),
		sectorNames: z.array(z.string().min(1)).optional(),
		sdgIds: z.array(z.number().int().positive()).optional(),
		members: z
			.array(
				z.object({
					userId: z.string().uuid(),
					projectRole: z.string().min(1),
				}),
			)
			.optional(),
	})
	.openapi("CreateProposal");

export const UpdateProposalSchema = z
	.object({
		title: z.string().min(1).optional(),
		bannerProgram: z.string().min(1).optional(),
		projectLocale: z.string().min(1).optional(),
		extensionCategory: z.string().min(1).optional(),
		budgetPartner: z.coerce.number().nonnegative().finite().optional(),
		budgetNeust: z.coerce.number().nonnegative().finite().optional(),
		sectorNames: z.array(z.string().min(1)).optional(),
	})
	.openapi("UpdateProposal");

export const ReviewProposalSchema = z
	.object({
		decision: z.enum([
			REVIEW_DECISION.ENDORSED,
			REVIEW_DECISION.APPROVED,
			REVIEW_DECISION.RETURNED,
			REVIEW_DECISION.REJECTED,
		]),
		comments: z.string().optional(),
	})
	.openapi("ReviewProposal");

export const DerivedStateSchema = z
	.object({
		state: z.enum(["ACT", "WAIT", "WATCH"]),
		owner: z.string(),
		reason: z.string(),
		nextTransition: z.string(),
	})
	.openapi("DerivedState");

export const CommentParams = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: "id", in: "path" } }),
	docId: z
		.string()
		.uuid()
		.openapi({ param: { name: "docId", in: "path" } }),
});

export const CreateCommentSchema = z
	.object({
		content: z.string().min(1),
		annotationJson: z
			.object({
				x: z.number(),
				y: z.number(),
				width: z.number(),
				height: z.number(),
				page: z.number(),
			})
			.nullable()
			.optional(),
	})
	.openapi("CreateComment");

export const CommentUserSchema = z.object({
	userId: z.string().uuid(),
	name: z.string(),
	email: z.string(),
	roleName: z.string(),
});

export const CommentResponseSchema = z
	.object({
		commentId: z.string().uuid(),
		proposalId: z.string().uuid(),
		documentId: z.string().uuid(),
		userId: z.string().uuid(),
		content: z.string(),
		annotationJson: z
			.object({
				x: z.number(),
				y: z.number(),
				width: z.number(),
				height: z.number(),
				page: z.number(),
			})
			.nullable(),
		createdAt: z.string(),
		user: CommentUserSchema,
	})
	.openapi("CommentResponse");

export const CommentListSchema = z
	.array(CommentResponseSchema)
	.openapi("CommentList");

export const ProposalPaginationQuery = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({
			param: { name: "limit", in: "query" },
		}),
	search: z
		.string()
		.optional()
		.openapi({
			param: { name: "search", in: "query" },
		}),
	status: ProposalStatusQuerySchema.optional().openapi({
		param: { name: "status", in: "query" },
	}),
	archived: z
		.string()
		.optional()
		.openapi({
			param: { name: "archived", in: "query" },
		}),
});

export { ParamId };
