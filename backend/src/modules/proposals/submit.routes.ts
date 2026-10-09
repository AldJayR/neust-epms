import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { createNotification } from "@/lib/notification.helpers.js";
import { ErrorSchema, MessageSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import { ParamId } from "./proposals.schema.js";
import { submitProposal } from "./proposals.service.js";

const app = new OpenAPIHono<AuthEnv>();
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
	await submitProposal(user, id, getClientIp(c));
	await createNotification({
		recipientId: user.userId,
		type: "proposal",
		title: "Submission Received",
		message: "Your proposal has been submitted and is pending review.",
	}).catch((err) => {
		console.error(
			"[notification] Failed to send submission acknowledgment:",
			err,
		);
	});
	return c.json({ message: "Proposal submitted for endorsement" }, 200);
});

export default app;
