import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposals } from "@/db/schema/proposals.js";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError } from "@/lib/errors.js";
import {
	createNotification,
	getUserIdsByRole,
} from "@/lib/notification.helpers.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import { PROPOSAL_STATUS, ROLE_NAMES } from "@/lib/types.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { ParamId, ReviewProposalSchema } from "./proposals.schema.js";
import {
	getLeaderUserId,
	processReview,
	recordInstitutionalApproval,
	recordSignedSpecialOrder,
} from "./proposals.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use(
	"/proposals/:id/institutional-approval",
	requireRole(ROLE_NAMES.DIRECTOR),
);
app.use(
	"/proposals/:id/signed-special-order",
	requireRole(ROLE_NAMES.DIRECTOR),
);

// ── POST /proposals/:id/review ──
const reviewRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/review",
	tags: ["Proposals"],
	summary: "Endorse or Approve a proposal (RET Chair / Director)",
	description:
		"All proposals require direct RET Chair endorsement before Director approval. No endorsement document is required. Chairs may endorse their own submissions; other self-review decisions remain prohibited.",
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
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Required revisions have not been verified",
		},
	},
});

app.openapi(reviewRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	const result = await processReview(
		user,
		id,
		{
			decision: body.decision,
			comments: body.comments,
		},
		getClientIp(c),
	);

	const leaderUserId = await getLeaderUserId(id).catch((error) => {
		console.error("[notification] Failed to resolve proposal leader:", error);
		return undefined;
	});
	const [existing] = await Promise.resolve(
		db
			.select({ title: proposals.title })
			.from(proposals)
			.where(eq(proposals.proposalId, id))
			.limit(1),
	).catch((error) => {
		console.error("[notification] Failed to resolve proposal title:", error);
		return [];
	});

	if (leaderUserId) {
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

	if (result.decision === PROPOSAL_STATUS.ENDORSED) {
		try {
			const directorIds = await getUserIdsByRole(ROLE_NAMES.DIRECTOR);
			for (const directorId of directorIds) {
				await createNotification({
					recipientId: directorId,
					type: "proposal",
					title: "Proposal Awaiting Approval",
					message: `Proposal "${existing?.title}" has been endorsed by the RET Chair and is ready for Director review.`,
					sendEmail: true,
				});
			}
		} catch (error) {
			console.error(
				"[notification] Failed to notify Directors of endorsement:",
				error,
			);
		}
	}

	return c.json({ message: `Proposal ${body.decision.toLowerCase()}` }, 200);
});

// ── POST /proposals/:id/institutional-approval ──
const institutionalApprovalRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/institutional-approval",
	tags: ["Proposals"],
	summary: "Upload signed proposal and Special Order scans (Director only)",
	description:
		"Records both signed scans before finalizing the proposal as institutionally approved.",
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
	const specialOrderFile = body.specialOrderFile;

	if (!(file instanceof File)) {
		throw new ApiError(
			400,
			"MISSING_FILE",
			"The signed approved proposal PDF is required",
		);
	}
	if (!(specialOrderFile instanceof File))
		throw new ApiError(
			400,
			"MISSING_SPECIAL_ORDER",
			"The signed Special Order PDF is required",
		);

	const result = await recordInstitutionalApproval(
		user,
		id,
		file,
		specialOrderFile,
		getClientIp(c),
	);

	return c.json({ message: result.message }, 200);
});

const signedSpecialOrderRoute = createRoute({
	method: "post",
	path: "/proposals/{id}/signed-special-order",
	tags: ["Proposals"],
	summary:
		"Upload a missing signed Special Order before activation (Director only)",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MessageSchema } },
			description: "Signed Special Order recorded",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid state or missing file",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Director only",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal not found",
		},
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Scan already recorded or proposal changed",
		},
		413: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "File too large",
		},
		422: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid PDF",
		},
	},
});

app.openapi(signedSpecialOrderRoute, async (c) => {
	const { id } = c.req.valid("param");
	const body = await c.req.parseBody();
	if (!(body.file instanceof File))
		throw new ApiError(
			400,
			"MISSING_FILE",
			"The signed Special Order PDF is required",
		);
	const result = await recordSignedSpecialOrder(
		c.get("user"),
		id,
		body.file,
		getClientIp(c),
	);
	return c.json(result, 200);
});

export default app;
