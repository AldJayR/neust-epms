import { randomUUID } from "node:crypto";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client.js";
import { proposalMembers } from "@/db/schema/proposal-members.js";
import { specialOrders } from "@/db/schema/special-orders.js";
import { insertAuditLog } from "@/lib/audit.js";
import { getClientIp } from "@/lib/client-ip.js";
import { ApiError, installApiErrorHandler } from "@/lib/errors.js";
import { ErrorSchema } from "@/lib/schemas.js";
import { supabase } from "@/lib/supabase.js";
import { ROLE_NAMES } from "@/lib/types.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { sanitizeFilename } from "@/services/file.service.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// ── Schemas ──
const SpecialOrderSchema = z
	.object({
		specialOrderId: z.string(),
		memberId: z.string(),
		soNumber: z.string(),
		storagePath: z.string().nullable(),
		dateIssued: z.string().nullable(),
		status: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		archivedAt: z.string().nullable(),
	})
	.openapi("SpecialOrder");

const SpecialOrderListSchema = z
	.object({ items: z.array(SpecialOrderSchema) })
	.openapi("SpecialOrderList");

const CreateSpecialOrderSchema = z
	.object({
		memberId: z.string(),
		soNumber: z.string().min(1),
		dateIssued: z.string().datetime().optional(),
	})
	.openapi("CreateSpecialOrder");

const UpdateSpecialOrderSchema = z
	.object({
		status: z.string().min(1).optional(),
		dateIssued: z.string().datetime().optional(),
	})
	.openapi("UpdateSpecialOrder");

const SignedUrlSchema = z
	.object({ url: z.string().url() })
	.openapi("SignedUrl");

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

app.use("/special-orders/*", authMiddleware);
app.use("/special-orders", authMiddleware);

// ── GET /special-orders ──
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
	const { page, limit } = c.req.valid("query");
	const offset = (page - 1) * limit;

	const rows = await db
		.select({
			specialOrderId: specialOrders.specialOrderId,
			memberId: specialOrders.memberId,
			soNumber: specialOrders.soNumber,
			storagePath: specialOrders.storagePath,
			dateIssued: specialOrders.dateIssued,
			status: specialOrders.status,
			createdAt: specialOrders.createdAt,
			updatedAt: specialOrders.updatedAt,
			archivedAt: specialOrders.archivedAt,
		})
		.from(specialOrders)
		.where(isNull(specialOrders.archivedAt))
		.orderBy(desc(specialOrders.createdAt))
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) => ({
		...r,
		dateIssued: r.dateIssued?.toISOString() ?? null,
		createdAt: r.createdAt.toISOString(),
		updatedAt: r.updatedAt.toISOString(),
		archivedAt: r.archivedAt?.toISOString() ?? null,
	}));

	return c.json({ items }, 200);
});

// ── POST /special-orders ──
const createRoute_ = createRoute({
	method: "post",
	path: "/special-orders",
	tags: ["Special Orders"],
	summary: "Create a special order linked to a proposal member (EC-03)",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: {
				"application/json": { schema: CreateSpecialOrderSchema },
			},
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: SpecialOrderSchema } },
			description: "Special order created",
		},
		400: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Validation error",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Member not found",
		},
	},
});

app.openapi(createRoute_, async (c) => {
	const user = c.get("user");
	const body = c.req.valid("json");

	// EC-03: Verify the member exists (must be in proposal_members)
	const [member] = await db
		.select({ memberId: proposalMembers.memberId })
		.from(proposalMembers)
		.where(eq(proposalMembers.memberId, body.memberId))
		.limit(1);

	if (!member) {
		throw new ApiError(
			404,
			"MEMBER_NOT_FOUND",
			"Proposal member not found — special orders must link to proposal_members (EC-03)",
		);
	}

	const [created] = await db
		.insert(specialOrders)
		.values({
			memberId: body.memberId,
			soNumber: body.soNumber,
			dateIssued: body.dateIssued ? new Date(body.dateIssued) : null,
		})
		.returning();

	if (!created) {
		throw new ApiError(500, "INSERT_FAILED", "Failed to create special order");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Created special order ${created.specialOrderId} for member ${body.memberId}`,
		tableAffected: "special_orders",
		ipAddress: getClientIp(c),
	});

	return c.json(
		{
			...created,
			dateIssued: created.dateIssued?.toISOString() ?? null,
			createdAt: created.createdAt.toISOString(),
			updatedAt: created.updatedAt.toISOString(),
			archivedAt: created.archivedAt?.toISOString() ?? null,
		},
		201,
	);
});

// ── PATCH /special-orders/:id ──
const updateRoute = createRoute({
	method: "patch",
	path: "/special-orders/{id}",
	tags: ["Special Orders"],
	summary: "Update a special order",
	security: [{ Bearer: [] }],
	request: {
		params: ParamId,
		body: {
			content: {
				"application/json": { schema: UpdateSpecialOrderSchema },
			},
			required: true,
		},
	},
	responses: {
		200: {
			content: { "application/json": { schema: SpecialOrderSchema } },
			description: "Updated",
		},
		404: {
			content: { "application/json": { schema: ErrorSchema } },
			description: "Not found",
		},
	},
});

app.openapi(updateRoute, async (c) => {
	const { id } = c.req.valid("param");
	const body = c.req.valid("json");

	const [updated] = await db
		.update(specialOrders)
		.set({
			...(body.status !== undefined ? { status: body.status } : {}),
			...(body.dateIssued !== undefined
				? { dateIssued: new Date(body.dateIssued) }
				: {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(specialOrders.specialOrderId, id),
				isNull(specialOrders.archivedAt),
			),
		)
		.returning();

	if (!updated) {
		throw new ApiError(404, "NOT_FOUND", "Special order not found");
	}

	return c.json(
		{
			...updated,
			dateIssued: updated.dateIssued?.toISOString() ?? null,
			createdAt: updated.createdAt.toISOString(),
			updatedAt: updated.updatedAt.toISOString(),
			archivedAt: updated.archivedAt?.toISOString() ?? null,
		},
		200,
	);
});

// ── POST /special-orders/upload ──
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

	const contentLength = Number(c.req.header("content-length") ?? 0);
	if (contentLength > MAX_UPLOAD_BYTES) {
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

	if (file.type !== "application/pdf") {
		throw new ApiError(422, "INVALID_FILE_TYPE", "Only PDF files are allowed");
	}

	if (typeof memberId !== "string" || !memberId) {
		throw new ApiError(400, "INVALID_MEMBER_ID", "memberId is required");
	}

	if (typeof soNumber !== "string" || !soNumber) {
		throw new ApiError(400, "INVALID_SO_NUMBER", "soNumber is required");
	}

	// Verify member exists and get proposalId for permission check (I.1: single query)
	const [member] = await db
		.select({
			memberId: proposalMembers.memberId,
			proposalId: proposalMembers.proposalId,
		})
		.from(proposalMembers)
		.where(eq(proposalMembers.memberId, memberId))
		.limit(1);

	if (!member) {
		throw new ApiError(404, "MEMBER_NOT_FOUND", "Proposal member not found");
	}

	// Permission check: Director OR Project Leader of the member's proposal
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		const [leader] = await db
			.select({
				userId: proposalMembers.userId,
			})
			.from(proposalMembers)
			.where(
				and(
					eq(proposalMembers.proposalId, member.proposalId),
					eq(proposalMembers.userId, user.userId),
					eq(proposalMembers.projectRole, "Project Leader"),
				),
			)
			.limit(1);

		if (!leader) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You must be the Director or Project Leader to upload special orders",
			);
		}
	}

	const sanitizedFilename = sanitizeFilename(file.name);
	const storagePath = `special-orders/${memberId}/${Date.now()}_${randomUUID()}_${sanitizedFilename}`;

	// Upload to Supabase Storage
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

	// Check if a special_orders record already exists for this member (I.6: explicit columns)
	const [existing] = await db
		.select({
			specialOrderId: specialOrders.specialOrderId,
			memberId: specialOrders.memberId,
			soNumber: specialOrders.soNumber,
			storagePath: specialOrders.storagePath,
			dateIssued: specialOrders.dateIssued,
			status: specialOrders.status,
			createdAt: specialOrders.createdAt,
			updatedAt: specialOrders.updatedAt,
			archivedAt: specialOrders.archivedAt,
		})
		.from(specialOrders)
		.where(
			and(
				eq(specialOrders.memberId, memberId),
				isNull(specialOrders.archivedAt),
			),
		)
		.limit(1);

	let record;
	let isNew = false;
	try {
		if (existing) {
			// Update existing record
			const [updated] = await db
				.update(specialOrders)
				.set({
					storagePath,
					soNumber,
					updatedAt: new Date(),
				})
				.where(eq(specialOrders.specialOrderId, existing.specialOrderId))
				.returning();

			if (!updated) {
				throw new ApiError(
					500,
					"UPDATE_FAILED",
					"Failed to update special order",
				);
			}
			record = updated;
		} else {
			// Insert new record — rely on DB unique constraint for SO number (I.3)
			const [inserted] = await db
				.insert(specialOrders)
				.values({
					memberId,
					soNumber,
					storagePath,
				})
				.returning();

			if (!inserted) {
				throw new ApiError(
					500,
					"INSERT_FAILED",
					"Failed to create special order",
				);
			}
			record = inserted;
			isNew = true;
		}
	} catch (error: unknown) {
		const err = error as Record<string, unknown> & { code?: string };
		// I.3: Catch PG unique-violation (23505) for duplicate SO number
		if (err?.code === "23505") {
			throw new ApiError(
				409,
				"DUPLICATE_SO_NUMBER",
				"A special order with this SO number already exists",
			);
		}
		// Compensate: delete uploaded file on any failure
		try {
			await supabase.storage.from("documents").remove([storagePath]);
		} catch {}
		throw error;
	}

	await insertAuditLog({
		userId: user.userId,
		action: `${existing ? "Updated" : "Created"} special order ${record.specialOrderId} for member ${memberId}`,
		tableAffected: "special_orders",
		ipAddress: getClientIp(c),
	});

	return c.json(
		{
			specialOrderId: record.specialOrderId,
			memberId: record.memberId,
			soNumber: record.soNumber,
			storagePath: record.storagePath,
			dateIssued: record.dateIssued?.toISOString() ?? null,
			status: record.status,
			createdAt: record.createdAt.toISOString(),
			updatedAt: record.updatedAt.toISOString(),
			archivedAt: record.archivedAt?.toISOString() ?? null,
		},
		isNew ? 201 : 200,
	);
});

// ── GET /special-orders/:id/url ──
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
	const user = c.get("user");
	const { id } = c.req.valid("param");

	// I.6: explicit column list
	const [order] = await db
		.select({
			specialOrderId: specialOrders.specialOrderId,
			memberId: specialOrders.memberId,
			soNumber: specialOrders.soNumber,
			storagePath: specialOrders.storagePath,
			dateIssued: specialOrders.dateIssued,
			status: specialOrders.status,
			createdAt: specialOrders.createdAt,
			updatedAt: specialOrders.updatedAt,
			archivedAt: specialOrders.archivedAt,
		})
		.from(specialOrders)
		.where(
			and(
				eq(specialOrders.specialOrderId, id),
				isNull(specialOrders.archivedAt),
			),
		)
		.limit(1);

	if (!order) {
		throw new ApiError(404, "NOT_FOUND", "Special order not found");
	}

	// I.5: Authorization check — Director, Project Leader of the proposal, or the member themselves
	if (user.roleName !== ROLE_NAMES.DIRECTOR) {
		const [member] = await db
			.select({
				memberId: proposalMembers.memberId,
				proposalId: proposalMembers.proposalId,
				userId: proposalMembers.userId,
			})
			.from(proposalMembers)
			.where(eq(proposalMembers.memberId, order.memberId))
			.limit(1);

		if (!member) {
			throw new ApiError(404, "MEMBER_NOT_FOUND", "Proposal member not found");
		}

		const isMember = member.userId === user.userId;

		let isProjectLeader = false;
		if (!isMember) {
			const [leader] = await db
				.select({ userId: proposalMembers.userId })
				.from(proposalMembers)
				.where(
					and(
						eq(proposalMembers.proposalId, member.proposalId),
						eq(proposalMembers.userId, user.userId),
						eq(proposalMembers.projectRole, "Project Leader"),
					),
				)
				.limit(1);
			isProjectLeader = !!leader;
		}

		if (!isMember && !isProjectLeader) {
			throw new ApiError(
				403,
				"FORBIDDEN",
				"You must be the Director, Project Leader, or the member to access this file",
			);
		}
	}

	if (!order.storagePath) {
		throw new ApiError(
			404,
			"NO_FILE",
			"No file uploaded for this special order",
		);
	}

	const { data, error } = await supabase.storage
		.from("documents")
		.createSignedUrl(order.storagePath, 3600);

	if (error || !data) {
		throw new ApiError(500, "URL_FAILED", "Failed to generate signed URL");
	}

	await insertAuditLog({
		userId: user.userId,
		action: `Accessed signed URL for special order ${id}`,
		tableAffected: "special_orders",
		ipAddress: getClientIp(c),
	});

	return c.json({ url: data.signedUrl }, 200);
});

export default app;
