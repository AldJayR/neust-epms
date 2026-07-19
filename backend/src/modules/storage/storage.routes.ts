import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError } from "@/lib/errors.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { getAvatarExtension, isPdfFile } from "@/services/file.service.js";
import {
	AvatarUploadResponseSchema,
	DocumentListSchema,
	DocumentParam,
	PaginationQuery,
	PresignedUrlSchema,
	ProposalParam,
	UploadResponseSchema,
} from "./storage.schema.js";
import {
	ensureUploadProposalDocumentAccess,
	getAnnotatedProposalDocument,
	getDocumentSignedUrl,
	listProposalDocuments,
	uploadProposalDocument,
	uploadUserAvatar,
} from "./storage.service.js";

const app = new OpenAPIHono<AuthEnv>();

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

app.use("/storage/avatar", authMiddleware);

const avatarRoute = createRoute({
	method: "post",
	path: "/storage/avatar",
	tags: ["Storage"],
	summary: "Upload the authenticated user's avatar",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			content: { "application/json": { schema: AvatarUploadResponseSchema } },
			description: "Avatar uploaded",
		},
		422: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid avatar",
		},
	},
});

app.openapi(avatarRoute, async (c) => {
	const contentLength = Number(c.req.header("content-length") ?? 0);
	if (contentLength > MAX_AVATAR_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "Avatar must be 5MB or smaller");
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	if (!(file instanceof File) || file.size <= 0) {
		throw new ApiError(
			422,
			"INVALID_AVATAR",
			"A valid avatar image is required",
		);
	}
	if (file.size > MAX_AVATAR_BYTES || !(await getAvatarExtension(file))) {
		throw new ApiError(
			422,
			"INVALID_AVATAR",
			"Avatar must be a valid JPEG, PNG, or WebP image under 5MB",
		);
	}

	const result = await uploadUserAvatar(c.get("user"), file, getClientIp(c));
	return c.json(result, 200);
});

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
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal not found",
		},
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
	description:
		"Proxies file upload to Supabase Storage. EC-04: new uploads increment version_num.",
	security: [{ Bearer: [] }],
	request: { params: ProposalParam },
	responses: {
		201: {
			content: { "application/json": { schema: UploadResponseSchema } },
			description: "Document uploaded",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Upload failed",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Proposal not found",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
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
	if (!(await isPdfFile(file))) {
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

const annotatedDownloadRoute = createRoute({
	method: "get",
	path: "/proposals/{proposalId}/documents/{documentId}/annotated",
	tags: ["Storage"],
	summary: "Download a proposal document with review annotations",
	security: [{ Bearer: [] }],
	request: { params: DocumentParam },
	responses: {
		200: { description: "Annotated PDF document" },
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Document not found",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Failed to generate annotated document",
		},
	},
});

app.openapi(annotatedDownloadRoute, async (c) => {
	const user = c.get("user");
	const { proposalId, documentId } = c.req.valid("param");
	const result = await getAnnotatedProposalDocument(
		user,
		proposalId,
		documentId,
		getClientIp(c),
	);

	return new Response(result.bytes, {
		status: 200,
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${result.fileName}"`,
			"Cache-Control": "no-store",
		},
	});
});

const getUrlRoute = createRoute({
	method: "get",
	path: "/proposals/{proposalId}/documents/{documentId}/url",
	tags: ["Storage"],
	summary: "Get a signed download URL for a document",
	security: [{ Bearer: [] }],
	request: { params: DocumentParam },
	responses: {
		200: {
			content: { "application/json": { schema: PresignedUrlSchema } },
			description: "Signed URL",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Document not found",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		500: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Internal server error",
		},
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
