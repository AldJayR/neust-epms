import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { insertAuditLog } from "@/lib/audit.js";
import { ApiError } from "@/lib/errors.js";
import { getClientIp } from "@/lib/client-ip.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import { PROPOSAL_STATUS } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { ParamId, ReviewProposalSchema } from "./proposals.schema.js";
import {
	getLeaderUserId,
	processReview,
	recordInstitutionalApproval,
} from "./proposals.service.js";

const app = new OpenAPIHono<AuthEnv>();

// ── POST /proposals/:id/review ──
const reviewRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/review",
	tags: ["Proposals"],
	summary: "Endorse or Approve a proposal (RET Chair / Director)",
	description:
		"EC-01: Prevents conflict of interest. EC-05: Stacked rejections preserved.",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: ReviewProposalSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Review recorded",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid transition",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Conflict of interest or wrong role",
		},
	},
});

app.openapi(reviewRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	const result = await processReview(user, id, {
		decision: body.decision,
		comments: body.comments,
	});

	await insertAuditLog({
		userId: user.userId,
		action: `Reviewed proposal ${id}: ${body.decision}`,
		tableAffected: "proposal_reviews",
		ipAddress: getClientIp(c),
	});

	const leaderUserId = await getLeaderUserId(id);

	if (leaderUserId) {
		const [existing] = await db
			.select({ title: proposals.title })
			.from(proposals)
			.where(eq(proposals.proposalId, id))
			.limit(1);

		let title = "Proposal Update";
		let message = `Your proposal "${existing?.title}" status has been updated to ${result.decision}.`;

		if (result.decision === PROPOSAL_STATUS.ENDORSED) {
			title = "Proposal Endorsed";
			message = `Your proposal "${existing?.title}" has been endorsed by the RET Chair and forwarded to the Director for approval.`;
		} else if (result.decision === PROPOSAL_STATUS.APPROVED) {
			title = "Proposal Approved";
			message = `Your proposal "${existing?.title}" has been approved by the Director.`;
		} else if (result.decision === PROPOSAL_STATUS.RETURNED) {
			title = "Proposal Returned";
			message = `Your proposal "${existing?.title}" has been returned by the ${user.roleName} for revisions. Comments: ${body.comments || "No comments left."}`;
		} else if (result.decision === PROPOSAL_STATUS.REJECTED) {
			title = "Proposal Rejected";
			message = `Your proposal "${existing?.title}" has been rejected. Comments: ${body.comments || "No comments left."}`;
		}

		await createNotification({
			recipientId: leaderUserId,
			type: "proposal",
			title,
			message,
			sendEmail: true,
		}).catch((err) => {
			console.error(
				"[notification] Failed to create evaluation notification:",
				err,
			);
		});
	}

	return c.json({ message: `Proposal ${body.decision.toLowerCase()}` }, 200);
});

// ── POST /proposals/:id/institutional-approval ──
const institutionalApprovalRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/institutional-approval",
	tags: ["Proposals"],
	summary: "Upload signed institutional approval scan (Director only)",
	description:
		"DFD Process 6.4: Records the Director's uploaded scan of the institutionally signed proposal, finalizing the proposal as institutionally approved.",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
	},
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Institutional approval recorded",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid proposal state or missing file",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Only Director can record institutional approval",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal not found",
		},
		422: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid file type",
		},
	},
});

app.openapi(institutionalApprovalRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	const body = await c.req.parseBody();
	const file = body.file;

	if (!(file instanceof File)) {
		throw new ApiError(400, "MISSING_FILE", "No PDF file uploaded");
	}

	const result = await recordInstitutionalApproval(
		user,
		id,
		file,
		getClientIp(c),
	);

	return c.json({ message: result.message }, 200);
});

export default app;
