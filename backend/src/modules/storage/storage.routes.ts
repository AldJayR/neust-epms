import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "@/lib/errors.js";
import { ErrorSchema } from "@/lib/schemas.js";
import type { AuthEnv } from "@/middleware/auth.js";
import {
	DocumentListSchema,
	DocumentParam,
	PaginationQuery,
	PresignedUrlSchema,
	ProposalParam,
	UploadResponseSchema,
} from "./storage.schema.js";
import {
	ensureUploadProposalDocumentAccess,
	getDocumentSignedUrl,
	listProposalDocuments,
	uploadProposalDocument,
} from "./storage.service.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// Auth for /proposals/* is registered once at the root app (see app.ts).

const listDocsRoute = createRoute({
	method: "get",
	path: "/proposals/{proposalId}/documents",
	tags: ["Storage"],
	summary: "List all document versions for a proposal (EC-04)",
	security: [{ Bearer: [] }],
	request: { params: ProposalParam, query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: DocumentListSchema } },
			description: "Document versions",
		},
		403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Proposal not found" },
	},
});

app.openapi(listDocsRoute, async (c) => {
	const user = c.get("user");
	const { proposalId } = c.req.valid("param");
	const { page, limit } = c.req.valid("query");
	const items = await listProposalDocuments(user, proposalId, page, limit);
	return c.json({ items }, 200);
});

const uploadRoute = createRoute({
	method: "post",
	path: "/proposals/{proposalId}/documents/upload",
	tags: ["Storage"],
	summary: "Upload a new proposal document version via backend proxy",
	description: "Proxies file upload to Supabase Storage. EC-04: new uploads increment version_num.",
	security: [{ Bearer: [] }],
	request: { params: ProposalParam },
	responses: {
		201: { content: { "application/json": { schema: UploadResponseSchema } }, description: "Document uploaded" },
		400: { content: { "application/json": { schema: ErrorSchema } }, description: "Upload failed" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Proposal not found" },
		403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
		413: { content: { "application/json": { schema: ErrorSchema } }, description: "File too large" },
		422: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid file type" },
		500: { content: { "application/json": { schema: ErrorSchema } }, description: "Internal server error" },
	},
});

app.openapi(uploadRoute, async (c) => {
	const user = c.get("user");
	const { proposalId } = c.req.valid("param");
	await ensureUploadProposalDocumentAccess(user, proposalId);
	const contentLength = Number(c.req.header("content-length") ?? 0);
	if (contentLength > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	if (!(file instanceof File)) {
		throw new ApiError(400, "NO_FILE", "A PDF file is required");
	}
	if (file.size <= 0) {
		throw new ApiError(422, "EMPTY_FILE", "Uploaded file cannot be empty");
	}
	if (file.size > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}
	if (file.type !== "application/pdf") {
		throw new ApiError(422, "INVALID_FILE_TYPE", "Only PDF files are allowed");
	}

	const ipAddress = getClientIp(c);
	const document = await uploadProposalDocument(
		user,
		proposalId,
		file,
		ipAddress,
	);
	return c.json(document, 201);
});

const getUrlRoute = createRoute({
	method: "get",
	path: "/proposals/{proposalId}/documents/{documentId}/url",
	tags: ["Storage"],
	summary: "Get a signed download URL for a document",
	security: [{ Bearer: [] }],
	request: { params: DocumentParam },
	responses: {
		200: { content: { "application/json": { schema: PresignedUrlSchema } }, description: "Signed URL" },
		404: { content: { "application/json": { schema: ErrorSchema } }, description: "Document not found" },
		403: { content: { "application/json": { schema: ErrorSchema } }, description: "Forbidden" },
		500: { content: { "application/json": { schema: ErrorSchema } }, description: "Internal server error" },
	},
});

app.openapi(getUrlRoute, async (c) => {
	const user = c.get("user");
	const { proposalId, documentId } = c.req.valid("param");
	const ipAddress = getClientIp(c);
	const result = await getDocumentSignedUrl(
		user,
		proposalId,
		documentId,
		ipAddress,
	);
	return c.json(result, 200);
});

export default app;
