import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { createClient } from "@supabase/supabase-js";
import { eq, and, isNull, max } from "drizzle-orm";
import { db } from "../db/client.js";
import { proposalDocuments } from "../db/schema/proposal-documents.js";
import { proposals } from "../db/schema/proposals.js";
import { env } from "../env.js";
import { authMiddleware, type AuthEnv } from "../middleware/auth.js";
import { insertAuditLog } from "../lib/audit.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
        storagePath: z.string(),
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
  proposalId: z.string().openapi({
    param: { name: "proposalId", in: "path" },
  }),
});

const DocumentParam = z.object({
  proposalId: z.string().openapi({
    param: { name: "proposalId", in: "path" },
  }),
  documentId: z.string().openapi({
    param: { name: "documentId", in: "path" },
  }),
});

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({
    param: { name: "page", in: "query" },
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    param: { name: "limit", in: "query" },
  }),
});

app.use("/*", authMiddleware);

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
  },
});

app.openapi(listDocsRoute, async (c) => {
  const { proposalId } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(proposalDocuments)
    .where(eq(proposalDocuments.proposalId, proposalId))
    .orderBy(proposalDocuments.versionNum)
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => ({
    ...r,
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
  request: {
    params: ProposalParam,
    body: {
      content: { "multipart/form-data": { schema: z.object({ file: z.string().openapi({ format: "binary" }) }) } },
      required: true,
    },
  },
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
  },
});

app.openapi(uploadRoute, async (c) => {
  const user = c.get("user");
  const { proposalId } = c.req.valid("param");

  // Verify proposal exists
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(
      and(eq(proposals.proposalId, proposalId), isNull(proposals.archivedAt)),
    )
    .limit(1);

  if (!proposal) {
    throw new ApiError(404, "NOT_FOUND", "Proposal not found");
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ApiError(400, "NO_FILE", "A PDF file is required");
  }

  // Determine next version number
  const [maxVersion] = await db
    .select({ maxVer: max(proposalDocuments.versionNum) })
    .from(proposalDocuments)
    .where(eq(proposalDocuments.proposalId, proposalId));

  const nextVersion = (maxVersion?.maxVer ?? 0) + 1;

  // Upload to Supabase Storage
  const storagePath = `proposals/${proposalId}/v${nextVersion}_${file.name}`;

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

  // Record in DB
  const [doc] = await db
    .insert(proposalDocuments)
    .values({
      proposalId,
      storagePath,
      versionNum: nextVersion,
    })
    .returning();

  if (!doc) {
    throw new ApiError(500, "INSERT_FAILED", "Failed to record document");
  }

  await insertAuditLog({
    userId: user.userId,
    action: `Uploaded document v${nextVersion} for proposal ${proposalId}`,
    tableAffected: "proposal_documents",
    ipAddress: c.req.header("x-forwarded-for") ?? null,
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
  },
});

app.openapi(getUrlRoute, async (c) => {
  const { proposalId, documentId } = c.req.valid("param");

  const [doc] = await db
    .select()
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

  return c.json({ url: data.signedUrl }, 200);
});

export default app;
