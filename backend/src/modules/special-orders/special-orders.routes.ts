import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError } from "@/lib/errors.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { isPdfFile } from "@/services/file.service.js";
import {
	PaginationQuery,
	ParamId,
	SignedUrlSchema,
	SpecialOrderListSchema,
	SpecialOrderSchema,
} from "./special-orders.schema.js";
import {
	getSpecialOrderSignedUrl,
	listSpecialOrders,
	uploadSpecialOrder,
} from "./special-orders.service.js";

const app = new OpenAPIHono<AuthEnv>();

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

app.use("/special-orders/*", authMiddleware);
app.use("/special-orders", authMiddleware);

const listRoute = createRoute({
	method: "get",
	path: "/special-orders",
	tags: ["Special Orders"],
	summary: "List all non-archived special orders",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: SpecialOrderListSchema } },
			description: "List of special orders",
		},
	},
});

app.openapi(listRoute, async (c) => {
	return c.json(await listSpecialOrders(c.req.valid("query")), 200);
});

const uploadRoute = createRoute({
	method: "post",
	path: "/special-orders/upload",
	tags: ["Special Orders"],
	summary: "Upload a special order PDF and create/update record",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: SpecialOrderSchema } },
			description: "Special order updated",
		},
		201: {
			content: { "application/json": { schema: SpecialOrderSchema } },
			description: "Special order created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid file",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Member not found",
		},
		409: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Duplicate SO number",
		},
		413: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "File too large",
		},
		422: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid file type",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Internal server error",
		},
	},
});

app.openapi(uploadRoute, async (c) => {
	const user = c.get("user");
	if (Number(c.req.header("content-length") ?? 0) > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	const memberId = formData.get("memberId");
	const soNumber = formData.get("soNumber");
	if (!(file instanceof File)) {
		throw new ApiError(400, "NO_FILE", "A PDF file is required");
	}
	if (file.size <= 0) {
		throw new ApiError(422, "EMPTY_FILE", "Uploaded file cannot be empty");
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}
	if (!(await isPdfFile(file))) {
		throw new ApiError(422, "INVALID_FILE_TYPE", "Only PDF files are allowed");
	}
	if (typeof memberId !== "string" || !memberId) {
		throw new ApiError(400, "INVALID_MEMBER_ID", "memberId is required");
	}
	if (typeof soNumber !== "string" || !soNumber) {
		throw new ApiError(400, "INVALID_SO_NUMBER", "soNumber is required");
	}

	const { record, isNew } = await uploadSpecialOrder(
		user,
		file,
		memberId,
		soNumber,
		getClientIp(c),
	);
	return c.json(record, isNew ? 201 : 200);
});

const getUrlRoute = createRoute({
	method: "get",
	path: "/special-orders/{id}/url",
	tags: ["Special Orders"],
	summary: "Get a signed URL for viewing/downloading a special order PDF",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: SignedUrlSchema } },
			description: "Signed URL",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found or no file uploaded",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Internal server error",
		},
	},
});

app.openapi(getUrlRoute, async (c) => {
	const result = await getSpecialOrderSignedUrl(
		c.get("user"),
		c.req.valid("param").id,
		getClientIp(c),
	);
	return c.json(result, 200);
});

export default app;
