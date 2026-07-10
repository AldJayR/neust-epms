import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { proposals } from "@/db/schema/proposals.js";
import { insertAuditLog } from "@/lib/audit.js";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError } from "@/lib/errors.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import { PROPOSAL_STATUS } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	isProjectLeader,
	PROJECT_LEADER_ROLE,
} from "@/services/auth-user.service.js";
import { ParamId } from "./proposals.schema.js";
import { validateCompleteness } from "./proposals.service.js";

const app = new OpenAPIHono<AuthEnv>();

// ── POST /proposals/:id/submit ──
const submitRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/submit",
	tags: ["Proposals"],
	summary: "Submit a draft proposal for endorsement (project leader only)",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Proposal submitted",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid state transition",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not project leader",
		},
	},
});

app.openapi(submitRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	const [existing] = await db
		.select({ proposalId: proposals.proposalId, status: proposals.status })
		.from(proposals)
		.where(and(eq(proposals.proposalId, id), isNull(proposals.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (
		existing.status !== PROPOSAL_STATUS.DRAFT &&
		existing.status !== PROPOSAL_STATUS.RETURNED
	) {
		throw new ApiError(
			400,
			"INVALID_STATUS",
			"Only Draft or Returned proposals can be submitted",
		);
	}

	if (!(await isProjectLeader(id, user.userId))) {
		throw new ApiError(403, "NOT_LEADER", "Only the project leader can submit");
	}

	await validateCompleteness(id);

	const [updated] = await db
		.update(proposals)
		.set({
			status: PROPOSAL_STATUS.PENDING_REVIEW,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(proposals.proposalId, id),
				or(
					eq(proposals.status, PROPOSAL_STATUS.DRAFT),
					eq(proposals.status, PROPOSAL_STATUS.RETURNED),
				),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(
			400,
			"INVALID_STATE",
			"Proposal state changed since last read",
		);
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Submitted proposal ${id}`,
		tableAffected: "proposals",
		ipAddress: getClientIp(c),
	});

	const [submitLeader] = await db
		.select({ userId: proposalMembers.userId })
		.from(proposalMembers)
		.where(
			and(
				eq(proposalMembers.proposalId, id),
				eq(proposalMembers.projectRole, PROJECT_LEADER_ROLE),
			),
		)
		.limit(1);

	if (submitLeader?.userId) {
		await createNotification({
			recipientId: submitLeader.userId,
			type: "proposal",
			title: "Submission Received",
			message: `Your proposal has been submitted and is pending review.`,
		}).catch((err) => {
			console.error(
				"[notification] Failed to send submission acknowledgment:",
				err,
			);
		});
	}

	return c.json({ message: "Proposal submitted for endorsement" }, 200);
});

export default app;
