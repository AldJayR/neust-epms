import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { isPdfFile } from "@/services/file.service.js";
import {
	CreateReportSchema,
	PaginationQuery,
	ReportListSchema,
	ReportSchema,
	ReportStatsSchema,
	SignedUrlSchema,
	ParamId,
} from "./reports.schema.js";
import {
	createReport,
	getReportSignedUrl,
	getReportStats,
	listReports,
	uploadReportDocument,
} from "./reports.service.js";

const app = new OpenAPIHono<AuthEnv>();
app.use("/reports/*", authMiddleware);
app.use("/reports", authMiddleware);

const listRoute = createRoute({
	method: "get",
	path: "/reports",
	tags: ["Reports"],
	summary: "List all non-archived project reports",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: ReportListSchema } },
			description: "Report list",
		},
	},
});
app.openapi(listRoute, async (c) => {
	const user = c.get("user");
	const query = c.req.valid("query");
	return c.json(await listReports(user, query), 200);
});

const statsRoute = createRoute({
	method: "get",
	path: "/reports/stats",
	tags: ["Reports"],
	summary: "Get report counts without fetching full list",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: ReportStatsSchema } },
			description: "Report statistics",
		},
	},
});
app.openapi(statsRoute, async (c) => {
	const user = c.get("user");
	return c.json(await getReportStats(user), 200);
});

const getUrlRoute = createRoute({
	method: "get",
	path: "/reports/{id}/url",
	tags: ["Reports"],
	summary: "Get a signed URL for viewing a report PDF",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: SignedUrlSchema } },
			description: "Signed URL",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Report not found or no file uploaded",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Failed to generate signed URL",
		},
	},
});

app.openapi(getUrlRoute, async (c) => {
	const result = await getReportSignedUrl(
		c.get("user"),
		c.req.valid("param").id,
		getClientIp(c),
	);
	return c.json(result, 200);
});

const createReportRoute = createRoute({
	method: "post",
	path: "/reports",
	tags: ["Reports"],
	summary: "Submit a project report for a project",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateReportSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: ReportSchema } },
			description: "Report created",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not a project member",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Project not found",
		},
	},
});
app.openapi(createReportRoute, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");
	const ipAddress = getClientIp(c);
	return c.json(await createReport(user, body, ipAddress), 201);
});

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

app.post("/reports/:id/document", async (c) => {
	const user = c.get("user");
	const contentLength = Number(c.req.header("content-length") ?? 0);
	if (contentLength > MAX_UPLOAD_BYTES) {
		return c.json(
			{ error: { code: "FILE_TOO_LARGE", message: "File exceeds 10MB limit" } },
			413,
		);
	}
	const formData = await c.req.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) throw new Error("A PDF file is required");
	if (file.size <= 0 || !(await isPdfFile(file))) {
		return c.json(
			{
				error: {
					code: "INVALID_FILE",
					message: "A non-empty PDF file is required",
				},
			},
			422,
		);
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		return c.json(
			{ error: { code: "FILE_TOO_LARGE", message: "File exceeds 10MB limit" } },
			413,
		);
	}
	return c.json(
		await uploadReportDocument(user, c.req.param("id"), file, getClientIp(c)),
		201,
	);
});

export default app;
