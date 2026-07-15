import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalComments } from "@/db/schema/proposal-comments.js";
import { proposalDocuments } from "@/db/schema/proposal-documents.js";
import { proposals } from "@/db/schema/proposals.js";
import { roles } from "@/db/schema/roles.js";
import { users } from "@/db/schema/users.js";
import { insertAuditLog } from "@/lib/audit.js";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError } from "@/lib/errors.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { isProposalInScope } from "@/lib/scope-helpers.js";
import { ROLE_NAMES } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	CommentListSchema,
	CommentParams,
	CommentResponseSchema,
	CreateCommentSchema,
} from "./proposals.schema.js";

const app = new OpenAPIHono<AuthEnv>();

// ── POST /proposals/:id/documents/:docId/comments ──
const createCommentRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/documents/{docId}/comments",
	tags: ["Proposals"],
	summary: "Add a spatial comment/annotation to a document",
	security: [{ Bearer: [] }],
	request: {
		params: CommentParams,
		body: {
			content: { "application/json": { schema: CreateCommentSchema } },
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: CommentResponseSchema } },
			description: "Comment created",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal or document not found",
		},
	},
});

app.openapi(createCommentRoute, async (c) => {
	const user = c.get("user");
	const { id: proposalId, docId: documentId } = c.req.valid("param");
	const { content, annotationJson } = c.req.valid("json");

	const [document] = await db
		.select({
			proposalId: proposalDocuments.proposalId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			bypassedRetChair: proposals.bypassedRetChair,
			archivedAt: proposals.archivedAt,
		})
		.from(proposalDocuments)
		.innerJoin(
			proposals,
			eq(proposalDocuments.proposalId, proposals.proposalId),
		)
		.where(
			and(
				eq(proposalDocuments.documentId, documentId),
				eq(proposalDocuments.proposalId, proposalId),
			),
		)
		.limit(1);

	if (!document || document.archivedAt) {
		throw new ApiError(404, "NOT_FOUND", "Document not found");
	}
	if (!isProposalInScope(user, document)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to this document",
		);
	}

	if (user.roleName === ROLE_NAMES.RET_CHAIR && document.bypassedRetChair) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"RET Chair review is bypassed for this proposal",
		);
	}

	const newComment = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(proposalComments)
			.values({
				documentId,
				userId: user.userId,
				content,
				annotationJson: annotationJson ?? null,
			})
			.returning();

		if (!created) {
			throw new ApiError(500, "INSERT_FAILED", "Failed to create comment");
		}

		await insertAuditLog(
			{
				userId: user.userId,
				action: `Created comment ${created.commentId}`,
				tableAffected: "proposal_comments",
				newValue: { documentId },
				ipAddress: getClientIp(c),
			},
			tx,
		);

		return created;
	});

	return c.json(
		{
			commentId: newComment.commentId,
			proposalId,
			documentId: newComment.documentId,
			userId: newComment.userId,
			content: newComment.content,
			annotationJson: newComment.annotationJson,
			createdAt: newComment.createdAt.toISOString(),
			user: {
				userId: user.userId,
				name: `${user.firstName} ${user.lastName}`.trim(),
				email: user.email,
				roleName: user.roleName,
			},
		},
		201,
	);
});

// ── GET /proposals/:id/documents/:docId/comments ──
const listCommentsRoute = createRoute({
	method: "get",
	path: "/proposals/{id}/documents/{docId}/comments",
	tags: ["Proposals"],
	summary: "Get all comments/annotations for a document",
	security: [{ Bearer: [] }],
	request: {
		params: CommentParams,
	},
	responses: {
		200: {
			content: { "application/json": { schema: CommentListSchema } },
			description: "List of comments",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Document not found",
		},
	},
});

app.openapi(listCommentsRoute, async (c) => {
	const user = c.get("user");
	const { id: proposalId, docId: documentId } = c.req.valid("param");
	const [document] = await db
		.select({
			proposalId: proposalDocuments.proposalId,
			campusId: proposals.campusId,
			departmentId: proposals.departmentId,
			archivedAt: proposals.archivedAt,
		})
		.from(proposalDocuments)
		.innerJoin(
			proposals,
			eq(proposalDocuments.proposalId, proposals.proposalId),
		)
		.where(
			and(
				eq(proposalDocuments.documentId, documentId),
				eq(proposalDocuments.proposalId, proposalId),
			),
		)
		.limit(1);
	if (!document || document.archivedAt) {
		throw new ApiError(404, "NOT_FOUND", "Document not found");
	}
	if (!isProposalInScope(user, document)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to this document",
		);
	}

	const rows = await db
		.select({
			commentId: proposalComments.commentId,
			proposalId: proposalDocuments.proposalId,
			documentId: proposalComments.documentId,
			userId: proposalComments.userId,
			content: proposalComments.content,
			annotationJson: proposalComments.annotationJson,
			createdAt: proposalComments.createdAt,
			userFirstName: users.firstName,
			userLastName: users.lastName,
			userEmail: users.email,
			userRoleName: roles.roleName,
		})
		.from(proposalComments)
		.innerJoin(
			proposalDocuments,
			eq(proposalComments.documentId, proposalDocuments.documentId),
		)
		.innerJoin(users, eq(proposalComments.userId, users.userId))
		.innerJoin(roles, eq(users.roleId, roles.roleId))
		.where(eq(proposalComments.documentId, documentId))
		.orderBy(desc(proposalComments.createdAt));

	return c.json(
		rows.map((row) => ({
			commentId: row.commentId,
			proposalId: row.proposalId,
			documentId: row.documentId,
			userId: row.userId,
			content: row.content,
			annotationJson: row.annotationJson,
			createdAt: row.createdAt.toISOString(),
			user: {
				userId: row.userId,
				name: `${row.userFirstName} ${row.userLastName}`.trim(),
				email: row.userEmail,
				roleName: row.userRoleName,
			},
		})),
		200,
	);
});

export default app;
