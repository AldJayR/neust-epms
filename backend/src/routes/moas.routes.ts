import { randomUUID } from "node:crypto";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { moas } from "../db/schema/moas.js";
import { partners } from "../db/schema/partners.js";
import { projects } from "../db/schema/projects.js";
import { proposalMembers } from "../db/schema/proposal-members.js";
import { insertAuditLog } from "../lib/audit.js";
import { getClientIp } from "../lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "../lib/errors.js";
import { type AuthUser, ROLE_NAMES } from "../lib/types.js";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";
import { type AuthEnv, authMiddleware } from "../middleware/auth.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

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

// MOA management is restricted to RET Chair and Director (Super Admin is not
// involved in MOA management per product decision).
function canManageMoas(user: AuthUser): boolean {
	return (
		user.roleName === ROLE_NAMES.RET_CHAIR ||
		user.roleName === ROLE_NAMES.DIRECTOR
	);
}

/**
 * Whether the user is a member (any project role) of a proposal whose project
 * is linked to the given MOA. Lets project leaders/members see the single MOA
 * their project depends on, without granting access to the full repository.
 */
async function isMoaLinkedToUserProject(
	moaId: string,
	userId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(projects)
		.innerJoin(
			proposalMembers,
			eq(projects.proposalId, proposalMembers.proposalId),
		)
		.where(and(eq(projects.moaId, moaId), eq(proposalMembers.userId, userId)))
		.limit(1);
	return !!row;
}

// ── Schemas ──
const MoaSchema = z
	.object({
		moaId: z.string(),
		partnerId: z.string(),
		storagePath: z.string().nullable(),
		validFrom: z.string(),
		validUntil: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
	})
	.openapi("Moa");

const MoaListSchema = z
	.object({ items: z.array(MoaSchema), total: z.number() })
	.openapi("MoaList");

const CreateMoaSchema = z
	.object({
		partnerId: z.string().uuid(),
		validFrom: z.string().datetime(),
		validUntil: z.string().datetime(),
	})
	.openapi("CreateMoa");

const UpdateMoaSchema = z
	.object({
		partnerId: z.string().uuid().optional(),
		validFrom: z.string().datetime().optional(),
		validUntil: z.string().datetime().optional(),
	})
	.openapi("UpdateMoa");

const ErrorSchema = z
	.object({
		error: z.object({ code: z.string(), message: z.string() }),
	})
	.openapi("MoaError");

const _MessageSchema = z.object({ message: z.string() }).openapi("MoaMessage");

const ParamId = z.object({
	id: z
		.string()
		.uuid()
		.openapi({ param: { name: "id", in: "path" } }),
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

app.use("/moas/*", authMiddleware);
app.use("/moas", authMiddleware);

// ── GET /moas ──
const listRoute = createRoute({
	method: "get",
	path: "/moas",
	tags: ["MOAs"],
	summary: "List all non-archived MOAs (RET Chair / Director only)",
	security: [{ Bearer: [] }],
	request: { query: PaginationQuery },
	responses: {
		200: {
			content: { "application/json": { schema: MoaListSchema } },
			description: "List of MOAs",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
	},
});

app.openapi(listRoute, async (c) => {
	const user = c.get("user");

	if (!canManageMoas(user)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"Only RET Chair or Director can view the MOA repository",
		);
	}

	const { page, limit } = c.req.valid("query");
	const offset = (page - 1) * limit;

	const rows = await db
		.select({
			moaId: moas.moaId,
			partnerId: moas.partnerId,
			storagePath: moas.storagePath,
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
			createdAt: moas.createdAt,
			updatedAt: moas.updatedAt,
			archivedAt: moas.archivedAt,
		})
		.from(moas)
		.where(isNull(moas.archivedAt))
		.orderBy(desc(moas.validUntil))
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		validFrom: r.validFrom.toISOString(),
		validUntil: r.validUntil.toISOString(),
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));

	const [totalResult] = await db
		.select({ value: count() })
		.from(moas)
		.where(isNull(moas.archivedAt));
	const total = Number(totalResult?.value ?? 0);

	return c.json({ items, total }, 200);
});

// ── GET /moas/:id ──
const getRoute = createRoute({
	method: "get",
	path: "/moas/{id}",
	tags: ["MOAs"],
	summary: "Get a MOA by ID",
	security: [{ Bearer: [] }],
	request: { params: ParamId },
	responses: {
		200: {
			content: { "application/json": { schema: MoaSchema } },
			description: "MOA detail",
		},
		403: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Forbidden",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(getRoute, async (c) => {
	const user = c.get("user");
	const { id } = c.req.valid("param");

	// RET Chair / Director can view any MOA. Other roles (e.g. project leaders
	// and members) may only view the MOA their own project is linked to.
	if (!canManageMoas(user)) {
		const linked = await isMoaLinkedToUserProject(id, user.userId);
		if (!linked) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You do not have access to this MOA",
			);
		}
	}

	const [row] = await db
		.select({
			moaId: moas.moaId,
			partnerId: moas.partnerId,
			storagePath: moas.storagePath,
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
			createdAt: moas.createdAt,
			updatedAt: moas.updatedAt,
			archivedAt: moas.archivedAt,
		})
		.from(moas)
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.limit(1);

	if (!row) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	return c.json(
		{
			...row,
			validFrom: row.validFrom.toISOString(),
			validUntil: row.validUntil.toISOString(),
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			archivedAt: row.archivedAt?.toISOString() ?? null,
		},
		200,
	);
});

// ── POST /moas ──
const createMoaRoute = createRoute({
	method: "post",
	path: "/moas",
	tags: ["MOAs"],
	summary: "Create a new MOA",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CreateMoaSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: MoaSchema } },
			description: "MOA created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
	},
});

app.openapi(createMoaRoute, async (c) => {
	const user = c.get("user");

	if (
		user.roleName !== ROLE_NAMES.SUPER_ADMIN &&
		user.roleName !== ROLE_NAMES.DIRECTOR
	) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"This action requires one of: Super Admin, Director",
		);
	}

	const body = c.req.valid("json");

	const validFrom = new Date(body.validFrom);
	const validUntil = new Date(body.validUntil);

	if (validUntil <= validFrom) {
		throw new ApiError(
			400,
			"INVALID_DATES",
			"validUntil must be after validFrom",
		);
	}

	// Verify partner exists
	const [partner] = await db
		.select({ partnerId: partners.partnerId })
		.from(partners)
		.where(eq(partners.partnerId, body.partnerId))
		.limit(1);

	if (!partner) {
		throw new ApiError(404, "PARTNER_NOT_FOUND", "Partner not found");
	}

	const [created] = await db
		.insert(moas)
		.values({
			partnerId: body.partnerId,
			validFrom,
			validUntil,
		})
		.returning();

	if (!created) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created MOA ${created.moaId}`,
		tableAffected: "moas",
		ipAddress: getClientIp(c),
	});

	return c.json(
		{
			...created,
			validFrom: created.validFrom.toISOString(),
			validUntil: created.validUntil.toISOString(),
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			archivedAt: created.archivedAt?.toISOString() ?? null,
		},
		201,
	);
});

// ── POST /moas/upload ──
const uploadMoaRoute = createRoute({
	method: "post",
	path: "/moas/upload",
	tags: ["MOAs"],
	summary: "Upload a MOA document PDF and create partner/MOA record",
	security: [{ Bearer: [] }],
	responses: {
		201: {
			content: { "application/json": { schema: MoaSchema } },
			description: "MOA created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Invalid request",
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

app.openapi(uploadMoaRoute, async (c) => {
	const user = c.get("user");

	if (!canManageMoas(user)) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"You must be the Director or RET Chair to manage MOAs",
		);
	}

	const contentLength = Number(c.req.header("content-length") ?? 0);
	if (contentLength > MAX_UPLOAD_BYTES) {
		throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 50MB limit");
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	const partnerName = formData.get("partnerName");
	const validFromStr = formData.get("validFrom");
	const validUntilStr = formData.get("validUntil");

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

	if (typeof partnerName !== "string" || !partnerName) {
		throw new ApiError(400, "INVALID_PARTNER_NAME", "partnerName is required");
	}

	if (typeof validFromStr !== "string" || !validFromStr) {
		throw new ApiError(400, "INVALID_VALID_FROM", "validFrom is required");
	}

	if (typeof validUntilStr !== "string" || !validUntilStr) {
		throw new ApiError(400, "INVALID_VALID_UNTIL", "validUntil is required");
	}

	const validFrom = new Date(validFromStr);
	const validUntil = new Date(validUntilStr);

	if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
		throw new ApiError(400, "INVALID_DATES", "Invalid date format");
	}

	if (validUntil <= validFrom) {
		throw new ApiError(
			400,
			"INVALID_DATES",
			"validUntil must be after validFrom",
		);
	}

	// 1. Get or create partner
	let partnerId: string;
	const [existingPartner] = await db
		.select({ partnerId: partners.partnerId })
		.from(partners)
		.where(eq(partners.partnerName, partnerName))
		.limit(1);

	if (existingPartner) {
		partnerId = existingPartner.partnerId;
	} else {
		const [newPartner] = await db
			.insert(partners)
			.values({
				partnerName,
				partnerType: "Institutional", // Default partner type
			})
			.returning({ partnerId: partners.partnerId });
		if (!newPartner) {
			throw new ApiError(500, "CREATE_PARTNER_FAILED", "Failed to create partner");
		}
		partnerId = newPartner.partnerId;
	}

	// 2. Upload to Supabase Storage
	const sanitizedFilename = sanitizeFilename(file.name);
	const storagePath = `moas/${partnerId}/${Date.now()}_${randomUUID()}_${sanitizedFilename}`;

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

	// 3. Create MOA record
	const [created] = await db
		.insert(moas)
		.values({
			partnerId,
			storagePath,
			validFrom,
			validUntil,
		})
		.returning();

	if (!created) {
		await supabase.storage.from("documents").remove([storagePath]);
		throw new ApiError(500, "INSERT_FAILED", "Failed to create MOA");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created MOA ${created.moaId} for partner ${partnerName}`,
		tableAffected: "moas",
		ipAddress: getClientIp(c),
	});

	return c.json(
		{
			...created,
			validFrom: created.validFrom.toISOString(),
			validUntil: created.validUntil.toISOString(),
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			archivedAt: created.archivedAt?.toISOString() ?? null,
		},
		201,
	);
});

// ── PATCH /moas/:id ──
const updateRoute = createRoute({
	method: "patch",
	path: "/moas/{id}",
	tags: ["MOAs"],
	summary: "Update a MOA",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: { "application/json": { schema: UpdateMoaSchema } },
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: MoaSchema } },
			description: "MOA updated",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(updateRoute, async (c) => {
	const user = c.get("user");

	if (
		user.roleName !== ROLE_NAMES.SUPER_ADMIN &&
		user.roleName !== ROLE_NAMES.DIRECTOR
	) {
		throw new ApiError(
			403,
			"FORBIDDEN",
			"This action requires one of: Super Admin, Director",
		);
	}

	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	// Load existing dates so we can validate the resulting range even when the
	// request only updates one bound.
	const [existing] = await db
		.select({
			validFrom: moas.validFrom,
			validUntil: moas.validUntil,
		})
		.from(moas)
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.limit(1);

	if (!existing) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	const nextValidFrom =
		body.validFrom !== undefined ? new Date(body.validFrom) : existing.validFrom;
	const nextValidUntil =
		body.validUntil !== undefined
			? new Date(body.validUntil)
			: existing.validUntil;

	if (nextValidUntil <= nextValidFrom) {
		throw new ApiError(
			400,
			"INVALID_DATES",
			"validUntil must be after validFrom",
		);
	}

	const setValues: Record<string, Date | string> = { updatedAt: new Date() };
	if (body.partnerId !== undefined) {
		// Verify partner exists
		const [partner] = await db
			.select({ partnerId: partners.partnerId })
			.from(partners)
			.where(eq(partners.partnerId, body.partnerId))
			.limit(1);

		if (!partner) {
			throw new ApiError(404, "PARTNER_NOT_FOUND", "Partner not found");
		}
		setValues.partnerId = body.partnerId;
	}
	if (body.validFrom !== undefined)
		setValues.validFrom = new Date(body.validFrom);
	if (body.validUntil !== undefined)
		setValues.validUntil = new Date(body.validUntil);

	const [updated] = await db
		.update(moas)
		.set(setValues)
		.where(and(eq(moas.moaId, id), isNull(moas.archivedAt)))
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "MOA not found");
	}

	return c.json(
		{
			...updated,
			validFrom: updated.validFrom.toISOString(),
			validUntil: updated.validUntil.toISOString(),
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			archivedAt: updated.archivedAt?.toISOString() ?? null,
		},
		200,
	);
});

export default app;
