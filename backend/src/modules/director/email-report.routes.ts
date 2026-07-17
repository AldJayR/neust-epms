import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { env } from "@/env.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/rbac.js";
import { sendEmailReport } from "./director.service.js";

const app = new OpenAPIHono<AuthEnv>();

app.use("/director/*", authMiddleware);
app.use("/director/*", requireRole(ROLE_NAMES.DIRECTOR, ROLE_NAMES.RET_CHAIR));

const emailReportRoute = createRoute({
	method: "post",
	path: "/director/email-report",
	tags: ["Director"],
	summary: "Email faculty directory report to director",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: {
				"application/json": {
					schema: z.object({
						search: z.string().optional(),
						college: z.string().optional(),
						status: z.string().optional(),
					}),
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({
						success: z.boolean(),
						message: z.string(),
					}),
				},
			},
			description: "Email sent successfully",
		},
		400: {
			description: "Invalid request or Resend not configured",
		},
	},
});

app.openapi(emailReportRoute, async (c) => {
	const body = c.req.valid("json");
	const user = c.get("user");

	if (!env.RESEND_API_KEY) {
		return c.json(
			{
				success: false,
				message: "Email service is not configured on the server.",
			},
			400,
		);
	}

	try {
		await sendEmailReport(body, user);
		return c.json(
			{ success: true, message: "Email report sent successfully." },
			200,
		);
	} catch (error) {
		console.error("Failed to send email report:", error);
		return c.json(
			{ success: false, message: "Failed to send email report." },
			500,
		);
	}
});

export default app;
