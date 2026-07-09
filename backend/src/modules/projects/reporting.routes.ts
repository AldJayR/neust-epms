import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { installApiErrorHandler } from "@/lib/errors.js";
import {
	ParamId,
	ProjectReadinessSchema,
	ProjectReportingScheduleSchema,
} from "./projects.schema.js";
import {
	getProjectReadiness,
	getProjectReportingSchedule,
} from "./projects.service.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

app.use("/projects/*", authMiddleware);

// ── GET /projects/:id/readiness ──
const projectReadinessRoute = createRoute({
	method: "get",
	path: "/projects/{id}/readiness",
	tags: ["Projects"],
	summary: "Get the project activation readiness checklist",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: ProjectReadinessSchema } },
			description: "Activation readiness checklist of the project",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});

app.openapi(projectReadinessRoute, async (c) => {
	const { id } = c.req.valid("param");
	const result = await getProjectReadiness(id);
	return c.json(result, 200);
});

// ── GET /projects/:id/reporting-schedule ──
const projectReportingScheduleRoute = createRoute({
	method: "get",
	path: "/projects/{id}/reporting-schedule",
	tags: ["Projects"],
	summary: "Get project reporting schedule, upcoming, and overdue milestones",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: {
				"application/json": { schema: ProjectReportingScheduleSchema },
			},
			description: "Reporting schedule information",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});

app.openapi(projectReportingScheduleRoute, async (c) => {
	const { id } = c.req.valid("param");
	const result = await getProjectReportingSchedule(id);
	return c.json(result, 200);
});

export default app;
