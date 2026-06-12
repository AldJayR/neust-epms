import { randomUUID } from "node:crypto";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createClient } from "@supabase/supabase-js";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { proposalDocuments } from "../db/schema/proposal-documents.js";
import { proposals } from "../db/schema/proposals.js";
import { env } from "../env.js";
import { insertAuditLog } from "../lib/audit.js";
import { getClientIp as getTrustedClientIp } from "../lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { type AuthUser, ROLE_NAMES } from "../lib/types.js";
import type { AuthEnv } from "../middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function sanitizeFilename(fileName: string): string {
	const normalized = fileName
		.normalize("NFKD")
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

	const fallback = "document.pdf";
	const candidate = normalized.length > 0 ? normalized : fallback;

	return candidate.toLowerCase().endsWith(".pdf")
		? candidate
		: `${candidate}.pdf`;
}

function canAccessProposalDocuments(
	user: AuthUser,
	proposal: { departmentId: number; campusId: number },
): boolean {
	if (user.roleName === ROLE_NAMES.FACULTY) {
		if (user.departmentId !== null) {
			return proposal.departmentId === user.departmentId;
		}
		return proposal.campusId === user.campusId;
	}

	if (user.roleName === ROLE_NAMES.RET_CHAIR) {
		if (user.isMainCampus && user.departmentId !== null) {
			return proposal.departmentId === user.departmentId;
		}
		return proposal.campusId === user.campusId;
	}

	return true;
}

function generateSecureStoragePath(
	proposalId: string,
	versionNum: number,
	fileName: string,
): string {
	const sanitizedFilename = sanitizeFilename(fileName);
	return `proposals/${proposalId}/v${versionNum}_${Date.now()}_${randomUUID()}_${sanitizedFilename}`;
}

// ── Schemas ──
const UploadResponseSchema = z
	.object({
		documentId: z.string(),
		storagePath: z.string(),
		versionNum: z.number(),
	})
	.openapi("UploadResponse");

const DocumentListSchema = z
	.object({
		items: z.array(
			z.object({
				documentId: z.string(),
				proposalId: z.string(),
				versionNum: z.number(),
				uploadedAt: z.string(),
			}),
		),
	})
	.openapi("DocumentList");

const PresignedUrlSchema = z
	.object({ url: z.string().url() })
	.openapi("PresignedUrl");

const ErrorSchema = z
	.object({
		error: z.object({ code: z.string(), message: z.string() }),
	})
	.openapi("StorageError");

const ProposalParam = z.object({
	proposalId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "proposalId", in: "path" },
		}),
});

const DocumentParam = z.object({
	proposalId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "proposalId", in: "path" },
		}),
	documentId: z
		.string()
		.uuid()
		.openapi({
			param: { name: "documentId", in: "path" },
		}),
});

const PaginationQuery = z.object({
	page: z.coerce
		.number()
		.int()
		.min(1)
		.default(1)
		.openapi({
			param: { name: "page", in: "query" },
		}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(50)
		.openapi({
			param: { name: "limit", in: "query" },
		}),
});

// Auth for /proposals/* is registered once at the root app (see app.ts).

// ── GET /proposals/:proposalId/documents ──
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
	const offset = (page - 1) * limit;

	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			departmentId: proposals.departmentId,
			campusId: proposals.campusId,
		})
		.from(proposals)
		.where(
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
		)
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (!canAccessProposalDocuments(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to documents for this proposal",
		);
	}

	const rows = await db
		.select({
			documentId: proposalDocuments.documentId,
			proposalId: proposalDocuments.proposalId,
			storagePath: proposalDocuments.storagePath,
			versionNum: proposalDocuments.versionNum,
			uploadedAt: proposalDocuments.uploadedAt,
		})
		.from(proposalDocuments)
		.where(eq(proposalDocuments.proposalId, proposalId))
		.orderBy(proposalDocuments.versionNum)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		documentId: r.documentId,
		proposalId: r.proposalId,
		versionNum: r.versionNum,
		uploadedAt: r.uploadedAt.toISOString(),
	}));

	return c.json({ items }, 200);
});

// ── POST /proposals/:proposalId/documents/upload ──
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

	// Verify proposal exists
	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			departmentId: proposals.departmentId,
			campusId: proposals.campusId,
		})
		.from(proposals)
		.where(
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
		)
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (!canAccessProposalDocuments(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have permission to upload documents for this proposal",
		);
	}

	// Pre-check Content-Length to avoid buffering large payloads in memory
	const contentLength = Number(c.req.header("content-length") ?? 0);
	if (contentLength > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 10MB limit");
	}

	// Parse multipart form data
	const formData = await c.req.formData();
	const file = formData.get("file");

	if (!(file instanceof File)) {
		throw new ApiError(400, "NO_FILE", "A PDF file is required");
	}

	if (file.size <= 0) {
		throw new ApiError(422, "EMPTY_FILE", "Uploaded file cannot be empty");
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 10MB limit");
	}

	if (file.type !== "application/pdf") {
		throw new ApiError(422, "INVALID_FILE_TYPE", "Only PDF files are allowed");
	}

	// 1. Determine next version (SELECT FOR UPDATE to prevent race condition)
	const nextVersion = await db.transaction(async (tx) => {
		const result = await tx.execute(sql`
			SELECT COALESCE(MAX(version_num), 0) + 1 AS max_ver
			FROM proposal_documents
			WHERE proposal_id = ${proposalId}
			FOR UPDATE
		`);
		return Number(result.rows[0]?.max_ver ?? 1);
	});

	const storagePath = generateSecureStoragePath(
		proposalId,
		nextVersion,
		file.name,
	);

	// 2. Upload to Supabase Storage (outside transaction)
	const { error: uploadError } = await supabase.storage
		.from("documents")
		.upload(storagePath, file, {
			contentType: file.type,
			upsert: false,
		});

	if (uploadError) {
		throw new ApiError(
			400,
			"UPLOAD_FAILED",
			`Supabase storage upload failed: ${uploadError.message}`,
		);
	}

	// 3. Insert DB record
	let doc;
	try {
		const [inserted] = await db
			.insert(proposalDocuments)
			.values({
				proposalId,
				storagePath,
				versionNum: nextVersion,
			})
			.returning();

		if (!inserted) {
			throw new ApiError(500, "INSERT_FAILED", "Failed to record document");
		}
		doc = inserted;
	} catch (error) {
		// Compensate: delete uploaded file
		try {
			await supabase.storage.from("documents").remove([storagePath]);
		} catch {}
		throw error;
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Uploaded document v${nextVersion} for proposal ${proposalId}`,
		tableAffected: "proposal_documents",
		ipAddress: getTrustedClientIp(c),
	});

	return c.json(
		{
			documentId: doc.documentId,
			storagePath: doc.storagePath,
			versionNum: doc.versionNum,
		},
		201,
	);
});

// ── GET /proposals/:proposalId/documents/:documentId/url ──
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

	const [proposal] = await db
		.select({
			proposalId: proposals.proposalId,
			departmentId: proposals.departmentId,
			campusId: proposals.campusId,
		})
		.from(proposals)
		.where(
			and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
		)
		.limit(1);

	if (!proposal) {
		throw new ApiError(404, "NOT_FOUND", "Proposal not found");
	}

	if (!canAccessProposalDocuments(user, proposal)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You do not have access to documents for this proposal",
		);
	}

	const [doc] = await db
		.select({
			documentId: proposalDocuments.documentId,
			storagePath: proposalDocuments.storagePath,
		})
		.from(proposalDocuments)
		.where(
			and(
				eq(proposalDocuments.documentId, documentId),
				eq(proposalDocuments.proposalId, proposalId),
			),
		)
		.limit(1);

	if (!doc) {
		throw new ApiError(404, "NOT_FOUND", "Document not found");
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(doc.storagePath, 3600);

	if (error || !data) {
		throw new ApiError(500, "URL_FAILED", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Downloaded signed URL for document ${documentId} (proposal ${proposalId})`,
		tableAffected: "proposal_documents",
		ipAddress: getTrustedClientIp(c),
	});

	return c.json({ url: data.signedUrl }, 200);
});

export default app;
